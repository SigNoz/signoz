package implinframonitoring

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
)

// getPerGroupContainerStatusCountsWithReqMetricChecks gates
// getPerGroupContainerStatusCounts on the required metrics being present. If
// either of containerStatusMetricNamesList (k8s.container.status.state /
// k8s.container.status.reason) has never been reported, it skips the query and
// returns a warning instead (the status derivation needs both). Otherwise it
// runs the query. The returned counts map is empty (never nil) when gated off.
func (m *module) getPerGroupContainerStatusCountsWithReqMetricChecks(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]containerStatusCounts, *qbtypes.QueryWarnData, error) {
	present, err := m.getMetricsExistence(ctx, containerStatusMetricNamesList)
	if err != nil {
		return nil, nil, err
	}

	var missing []string
	for _, name := range containerStatusMetricNamesList {
		if !present[name] {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		warning := &qbtypes.QueryWarnData{
			Message: fmt.Sprintf(
				"Container status could not be computed: required metric(s) not found: %s. "+
					"Enable the optional k8s.container.status.state and k8s.container.status.reason "+
					"metrics in the k8s_cluster receiver to see container statuses.",
				strings.Join(missing, ", "),
			),
			Url: docLinkK8sClusterReceiver,
		}
		return map[string]containerStatusCounts{}, warning, nil
	}

	counts, err := m.getPerGroupContainerStatusCounts(ctx, start, end, filter, groupBy, pageGroups)
	if err != nil {
		return nil, nil, err
	}
	return counts, nil, nil
}

// getPerGroupContainerStatusCounts computes per-group counts of distinct
// containers bucketed by their latest kubectl-style display status in window.
// Caller must ensure the required metrics exist
// (getPerGroupContainerStatusCountsWithReqMetricChecks).
//
// Row identity is (pod_uid, container_name). Pipeline:
//
//	state_fps / container_state:   current k8s.container.status.state per container
//	                               (argMaxIf(state, unix_milli, value=1) — safe because a
//	                               container always has exactly one active state).
//	reason_fps / container_reason: highest-priority active k8s.container.status.reason per
//	                               container (two-level: HAVING is_active=1 excludes stale
//	                               reasons of recovered containers).
//	container_status:              display status per container (reason > state fallback).
//	countContainersPerStatus:      per-group uniqExactIf over distinct (pod_uid, container_name).
//
// Groups absent from the result map have implicit zero counts (caller default).
func (m *module) getPerGroupContainerStatusCounts(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]containerStatusCounts, error) {
	if len(pageGroups) == 0 || len(groupBy) == 0 {
		return map[string]containerStatusCounts{}, nil
	}

	userFilterExpr := ""
	if filter != nil {
		userFilterExpr = filter.Expression
	}
	mergedFilterExpr := mergeFilterExpressions(userFilterExpr, buildPageGroupsFilterExpr(pageGroups))

	samplesStartMs, flooredEndMs, tsAdjustedStart, _, localTimeSeriesTable, distributedSamplesTable, _ := alignedMetricWindow(start, end)
	valueCol := telemetrymetrics.ValueColumnForSamplesTable(distributedSamplesTable)

	// Built once; identical across the two fps CTEs (buildFilterClause hits the
	// metadata store + parses the expression). AddWhereClause only reads it.
	var (
		filterClause *sqlbuilder.WhereClause
		err          error
	)
	if mergedFilterExpr != "" {
		filterClause, err = m.buildFilterClause(ctx, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
		if err != nil {
			return nil, err
		}
	}

	// ----- state_fps (carries groupBy cols) -----
	stateFps := sqlbuilder.NewSelectBuilder()
	stateFpsCols := []string{
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", stateFps.Var(podUIDAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS container_name", stateFps.Var(containerNameAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS state", stateFps.Var(containerStatusStateAttrKey)),
	}
	for _, key := range groupBy {
		stateFpsCols = append(stateFpsCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", stateFps.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	stateFps.Select(stateFpsCols...)
	stateFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	stateFps.Where(
		stateFps.E("metric_name", containerStatusStateMetricName),
		stateFps.GE("unix_milli", tsAdjustedStart),
		stateFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		stateFps.AddWhereClause(filterClause)
	}
	stateFpsGroupBy := []string{"fingerprint", "pod_uid", "container_name", "state"}
	for _, key := range groupBy {
		stateFpsGroupBy = append(stateFpsGroupBy, quoteIdentifier(key.Name))
	}
	stateFps.GroupBy(stateFpsGroupBy...)
	stateFpsSQL, stateFpsArgs := stateFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- container_state (current state per container; single-pass argMaxIf) -----
	containerState := sqlbuilder.NewSelectBuilder()
	containerStateCols := []string{
		"fps.pod_uid AS pod_uid",
		"fps.container_name AS container_name",
	}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		containerStateCols = append(containerStateCols, fmt.Sprintf("argMax(fps.%s, samples.unix_milli) AS %s", col, col))
	}
	containerStateCols = append(containerStateCols,
		fmt.Sprintf("argMaxIf(fps.state, samples.unix_milli, samples.%s = 1) AS state", valueCol),
	)
	containerState.Select(containerStateCols...)
	containerState.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN state_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	containerState.Where(
		containerState.E("samples.metric_name", containerStatusStateMetricName),
		containerState.GE("samples.unix_milli", samplesStartMs),
		containerState.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	containerState.GroupBy("fps.pod_uid", "fps.container_name")
	containerStateSQL, containerStateArgs := containerState.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- reason_fps -----
	reasonFps := sqlbuilder.NewSelectBuilder()
	reasonFps.Select(
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", reasonFps.Var(podUIDAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS container_name", reasonFps.Var(containerNameAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS reason", reasonFps.Var(containerStatusReasonAttrKey)),
	)
	reasonFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	reasonFps.Where(
		reasonFps.E("metric_name", containerStatusReasonMetricName),
		reasonFps.GE("unix_milli", tsAdjustedStart),
		reasonFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		reasonFps.AddWhereClause(filterClause)
	}
	reasonFps.GroupBy("fingerprint", "pod_uid", "container_name", "reason")
	reasonFpsSQL, reasonFpsArgs := reasonFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- container_reason -----
	// Inner: latest value per (pod, container, reason) -> kills stale fingerprints
	// from old container incarnations; keep only active (=1). Outer:
	// highest-priority active reason per container (waiting > terminated).
	priorityCase := "CASE fps.reason " +
		"WHEN 'CrashLoopBackOff' THEN 8 " +
		"WHEN 'ImagePullBackOff' THEN 7 " +
		"WHEN 'ErrImagePull' THEN 6 " +
		"WHEN 'CreateContainerConfigError' THEN 5 " +
		"WHEN 'ContainerCreating' THEN 4 " +
		"WHEN 'OOMKilled' THEN 3 " +
		"WHEN 'Error' THEN 2 " +
		"WHEN 'ContainerCannotRun' THEN 1 " +
		"WHEN 'Completed' THEN 0 " +
		"ELSE -1 END"
	reasonInner := sqlbuilder.NewSelectBuilder()
	reasonInner.Select(
		"fps.pod_uid AS pod_uid",
		"fps.container_name AS container_name",
		"fps.reason AS reason",
		fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS is_active", valueCol),
		priorityCase+" AS priority",
	)
	reasonInner.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN reason_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	reasonInner.Where(
		reasonInner.E("samples.metric_name", containerStatusReasonMetricName),
		reasonInner.GE("samples.unix_milli", samplesStartMs),
		reasonInner.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	reasonInner.GroupBy("fps.pod_uid", "fps.container_name", "fps.reason")
	reasonInner.Having("is_active = 1")
	reasonInnerSQL, reasonInnerArgs := reasonInner.BuildWithFlavor(sqlbuilder.ClickHouse)
	containerReasonSQL := fmt.Sprintf(
		"SELECT pod_uid, container_name, argMax(reason, priority) AS active_reason FROM (%s) GROUP BY pod_uid, container_name",
		reasonInnerSQL,
	)

	// ----- container_status (display status per container) -----
	// container reason > state fallback (running/terminated/waiting).
	displayStatusExpr := "multiIf(" +
		"cr.active_reason != '', cr.active_reason, " +
		"st.state = 'running', 'Running', " +
		"st.state = 'terminated', 'Terminated', " +
		"st.state = 'waiting', 'Waiting', " +
		"'Unknown')"
	containerStatusSelectCols := []string{
		"st.pod_uid AS pod_uid",
		"st.container_name AS container_name",
	}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		containerStatusSelectCols = append(containerStatusSelectCols, fmt.Sprintf("st.%s AS %s", col, col))
	}
	containerStatusSelectCols = append(containerStatusSelectCols, displayStatusExpr+" AS display_status")
	containerStatusSQL := fmt.Sprintf(
		"SELECT %s FROM container_state AS st "+
			"LEFT JOIN container_reason AS cr ON st.pod_uid = cr.pod_uid AND st.container_name = cr.container_name",
		strings.Join(containerStatusSelectCols, ", "),
	)

	// ----- countContainersPerStatus (outer SELECT) -----
	// Fixed status order; MUST match the containerStatusCounts assignment below.
	displayStatuses := []string{
		"Running", "Waiting", "Terminated",
		"CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "CreateContainerConfigError",
		"ContainerCreating", "OOMKilled", "Completed", "Error", "ContainerCannotRun",
		"Unknown",
	}
	countSelectCols := make([]string, 0, len(groupBy)+len(displayStatuses))
	countGroupBy := make([]string, 0, len(groupBy))
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		countSelectCols = append(countSelectCols, col)
		countGroupBy = append(countGroupBy, col)
	}
	for i, st := range displayStatuses {
		countSelectCols = append(countSelectCols,
			fmt.Sprintf("uniqExactIf((pod_uid, container_name), display_status = '%s') AS c%d", st, i),
		)
	}
	countSQL := fmt.Sprintf(
		"SELECT %s FROM container_status GROUP BY %s",
		strings.Join(countSelectCols, ", "),
		strings.Join(countGroupBy, ", "),
	)

	// Combine CTEs + outer. Arg order mirrors CTE declaration order.
	cteFragments := []string{
		fmt.Sprintf("state_fps AS (%s)", stateFpsSQL),
		fmt.Sprintf("container_state AS (%s)", containerStateSQL),
		fmt.Sprintf("reason_fps AS (%s)", reasonFpsSQL),
		fmt.Sprintf("container_reason AS (%s)", containerReasonSQL),
		fmt.Sprintf("container_status AS (%s)", containerStatusSQL),
	}
	finalSQL := querybuilder.CombineCTEs(cteFragments) + countSQL
	finalArgs := querybuilder.PrependArgs([][]any{
		stateFpsArgs, containerStateArgs, reasonFpsArgs, reasonInnerArgs,
	}, nil)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, finalSQL, finalArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]containerStatusCounts)
	for rows.Next() {
		groupVals := make([]string, len(groupBy))
		counts := make([]uint64, len(displayStatuses))
		scanPtrs := make([]any, 0, len(groupBy)+len(displayStatuses))
		for i := range groupVals {
			scanPtrs = append(scanPtrs, &groupVals[i])
		}
		for i := range counts {
			scanPtrs = append(scanPtrs, &counts[i])
		}
		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}
		result[compositeKeyFromList(groupVals)] = containerStatusCounts{
			Running:                    int(counts[0]),
			Waiting:                    int(counts[1]),
			Terminated:                 int(counts[2]),
			CrashLoopBackOff:           int(counts[3]),
			ImagePullBackOff:           int(counts[4]),
			ErrImagePull:               int(counts[5]),
			CreateContainerConfigError: int(counts[6]),
			ContainerCreating:          int(counts[7]),
			OOMKilled:                  int(counts[8]),
			Completed:                  int(counts[9]),
			Error:                      int(counts[10]),
			ContainerCannotRun:         int(counts[11]),
			Unknown:                    int(counts[12]),
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// getPerGroupContainerRestartCounts computes the absolute container restart count
// per group from k8s.container.restarts (default-enabled, so no existence gate).
// In list mode (groupBy contains the row identity) each group is one container ->
// its restart count; in grouped mode it's the summed restarts across all
// containers in the group. argMax(value, unix_milli) per (pod, container) takes
// the current cumulative count from the latest incarnation, then sum.
//
//	restart_fps:        fp ↔ (pod_uid, container_name, groupBy cols) from time_series.
//	container_restarts: INNER JOIN samples, latest restartCount per (pod, container).
//	(outer):            per-group sum(restart_count).
//
// Groups absent from the result map have no data (caller default).
func (m *module) getPerGroupContainerRestartCounts(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]int64, error) {
	if len(pageGroups) == 0 || len(groupBy) == 0 {
		return map[string]int64{}, nil
	}

	userFilterExpr := ""
	if filter != nil {
		userFilterExpr = filter.Expression
	}
	mergedFilterExpr := mergeFilterExpressions(userFilterExpr, buildPageGroupsFilterExpr(pageGroups))

	samplesStartMs, flooredEndMs, tsAdjustedStart, _, localTimeSeriesTable, distributedSamplesTable, _ := alignedMetricWindow(start, end)
	valueCol := telemetrymetrics.ValueColumnForSamplesTable(distributedSamplesTable)

	var (
		filterClause *sqlbuilder.WhereClause
		err          error
	)
	if mergedFilterExpr != "" {
		filterClause, err = m.buildFilterClause(ctx, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
		if err != nil {
			return nil, err
		}
	}

	// ----- restart_fps (carries groupBy cols) -----
	restartFps := sqlbuilder.NewSelectBuilder()
	restartFpsCols := []string{
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", restartFps.Var(podUIDAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS container_name", restartFps.Var(containerNameAttrKey)),
	}
	for _, key := range groupBy {
		restartFpsCols = append(restartFpsCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", restartFps.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	restartFps.Select(restartFpsCols...)
	restartFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	restartFps.Where(
		restartFps.E("metric_name", containerRestartsMetricName),
		restartFps.GE("unix_milli", tsAdjustedStart),
		restartFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		restartFps.AddWhereClause(filterClause)
	}
	restartFpsGroupBy := []string{"fingerprint", "pod_uid", "container_name"}
	for _, key := range groupBy {
		restartFpsGroupBy = append(restartFpsGroupBy, quoteIdentifier(key.Name))
	}
	restartFps.GroupBy(restartFpsGroupBy...)
	restartFpsSQL, restartFpsArgs := restartFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- container_restarts (latest cumulative count per container) -----
	containerRestarts := sqlbuilder.NewSelectBuilder()
	containerRestartsCols := []string{
		"fps.pod_uid AS pod_uid",
		"fps.container_name AS container_name",
	}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		containerRestartsCols = append(containerRestartsCols, fmt.Sprintf("argMax(fps.%s, samples.unix_milli) AS %s", col, col))
	}
	containerRestartsCols = append(containerRestartsCols, fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS restart_count", valueCol))
	containerRestarts.Select(containerRestartsCols...)
	containerRestarts.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN restart_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	containerRestarts.Where(
		containerRestarts.E("samples.metric_name", containerRestartsMetricName),
		containerRestarts.GE("samples.unix_milli", samplesStartMs),
		containerRestarts.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	containerRestarts.GroupBy("fps.pod_uid", "fps.container_name")
	containerRestartsSQL, containerRestartsArgs := containerRestarts.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- outer: per-group sum across containers -----
	sumSelectCols := make([]string, 0, len(groupBy)+1)
	sumGroupBy := make([]string, 0, len(groupBy))
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		sumSelectCols = append(sumSelectCols, col)
		sumGroupBy = append(sumGroupBy, col)
	}
	sumSelectCols = append(sumSelectCols, "sum(restart_count) AS total_restarts")
	sumSQL := fmt.Sprintf(
		"SELECT %s FROM container_restarts GROUP BY %s",
		strings.Join(sumSelectCols, ", "),
		strings.Join(sumGroupBy, ", "),
	)

	cteFragments := []string{
		fmt.Sprintf("restart_fps AS (%s)", restartFpsSQL),
		fmt.Sprintf("container_restarts AS (%s)", containerRestartsSQL),
	}
	finalSQL := querybuilder.CombineCTEs(cteFragments) + sumSQL
	finalArgs := querybuilder.PrependArgs([][]any{restartFpsArgs, containerRestartsArgs}, nil)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, finalSQL, finalArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int64)
	for rows.Next() {
		groupVals := make([]string, len(groupBy))
		var totalRestarts float64
		scanPtrs := make([]any, 0, len(groupBy)+1)
		for i := range groupVals {
			scanPtrs = append(scanPtrs, &groupVals[i])
		}
		scanPtrs = append(scanPtrs, &totalRestarts)
		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}
		result[compositeKeyFromList(groupVals)] = int64(totalRestarts)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// getPerGroupContainerReadyCounts computes per-group counts of distinct
// containers bucketed by their latest readiness (k8s.container.ready, a single
// 0/1 gauge per container — default-enabled, so no existence gate). ready = latest
// value 1; not_ready = latest value < 1.
//
//	ready_fps:       fp ↔ (pod_uid, container_name, groupBy cols) from time_series.
//	container_ready: INNER JOIN samples, latest ready value per (pod, container).
//	(outer):         per-group uniqExactIf over distinct (pod_uid, container_name).
//
// Groups absent from the result map have no data (caller default).
func (m *module) getPerGroupContainerReadyCounts(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]containerReadyCounts, error) {
	if len(pageGroups) == 0 || len(groupBy) == 0 {
		return map[string]containerReadyCounts{}, nil
	}

	userFilterExpr := ""
	if filter != nil {
		userFilterExpr = filter.Expression
	}
	mergedFilterExpr := mergeFilterExpressions(userFilterExpr, buildPageGroupsFilterExpr(pageGroups))

	samplesStartMs, flooredEndMs, tsAdjustedStart, _, localTimeSeriesTable, distributedSamplesTable, _ := alignedMetricWindow(start, end)
	valueCol := telemetrymetrics.ValueColumnForSamplesTable(distributedSamplesTable)

	var (
		filterClause *sqlbuilder.WhereClause
		err          error
	)
	if mergedFilterExpr != "" {
		filterClause, err = m.buildFilterClause(ctx, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
		if err != nil {
			return nil, err
		}
	}

	// ----- ready_fps (carries groupBy cols) -----
	readyFps := sqlbuilder.NewSelectBuilder()
	readyFpsCols := []string{
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", readyFps.Var(podUIDAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS container_name", readyFps.Var(containerNameAttrKey)),
	}
	for _, key := range groupBy {
		readyFpsCols = append(readyFpsCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", readyFps.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	readyFps.Select(readyFpsCols...)
	readyFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	readyFps.Where(
		readyFps.E("metric_name", containerReadyMetricName),
		readyFps.GE("unix_milli", tsAdjustedStart),
		readyFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		readyFps.AddWhereClause(filterClause)
	}
	readyFpsGroupBy := []string{"fingerprint", "pod_uid", "container_name"}
	for _, key := range groupBy {
		readyFpsGroupBy = append(readyFpsGroupBy, quoteIdentifier(key.Name))
	}
	readyFps.GroupBy(readyFpsGroupBy...)
	readyFpsSQL, readyFpsArgs := readyFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- container_ready (latest 0/1 per container) -----
	containerReady := sqlbuilder.NewSelectBuilder()
	containerReadyCols := []string{
		"fps.pod_uid AS pod_uid",
		"fps.container_name AS container_name",
	}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		containerReadyCols = append(containerReadyCols, fmt.Sprintf("argMax(fps.%s, samples.unix_milli) AS %s", col, col))
	}
	containerReadyCols = append(containerReadyCols, fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS ready_value", valueCol))
	containerReady.Select(containerReadyCols...)
	containerReady.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN ready_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	containerReady.Where(
		containerReady.E("samples.metric_name", containerReadyMetricName),
		containerReady.GE("samples.unix_milli", samplesStartMs),
		containerReady.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	containerReady.GroupBy("fps.pod_uid", "fps.container_name")
	containerReadySQL, containerReadyArgs := containerReady.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- outer: per-group ready / not_ready counts over distinct containers -----
	countSelectCols := make([]string, 0, len(groupBy)+2)
	countGroupBy := make([]string, 0, len(groupBy))
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		countSelectCols = append(countSelectCols, col)
		countGroupBy = append(countGroupBy, col)
	}
	countSelectCols = append(countSelectCols,
		"uniqExactIf((pod_uid, container_name), ready_value = 1) AS ready",
		"uniqExactIf((pod_uid, container_name), ready_value < 1) AS not_ready",
	)
	countSQL := fmt.Sprintf(
		"SELECT %s FROM container_ready GROUP BY %s",
		strings.Join(countSelectCols, ", "),
		strings.Join(countGroupBy, ", "),
	)

	cteFragments := []string{
		fmt.Sprintf("ready_fps AS (%s)", readyFpsSQL),
		fmt.Sprintf("container_ready AS (%s)", containerReadySQL),
	}
	finalSQL := querybuilder.CombineCTEs(cteFragments) + countSQL
	finalArgs := querybuilder.PrependArgs([][]any{readyFpsArgs, containerReadyArgs}, nil)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, finalSQL, finalArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]containerReadyCounts)
	for rows.Next() {
		groupVals := make([]string, len(groupBy))
		var ready, notReady uint64
		scanPtrs := make([]any, 0, len(groupBy)+2)
		for i := range groupVals {
			scanPtrs = append(scanPtrs, &groupVals[i])
		}
		scanPtrs = append(scanPtrs, &ready, &notReady)
		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}
		result[compositeKeyFromList(groupVals)] = containerReadyCounts{
			Ready:    int(ready),
			NotReady: int(notReady),
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}
