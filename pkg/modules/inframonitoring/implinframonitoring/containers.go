package implinframonitoring

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// buildContainerRecords assembles the page records, merging kubeletstats
// metrics (A-F from the querier) with the k8scluster health signals (status,
// restarts, ready). In list mode (isContainerRowInGroupBy=true) each group is a
// single container, so exactly one status/ready bucket is 1 and the single
// Status/Ready fields are derived from it; otherwise they stay NoData and only
// the per-group counts are populated.
func buildContainerRecords(
	isContainerNameAndPodUIDInGroupBy bool,
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	statusCounts map[string]containerStatusCounts,
	restartCounts map[string]int64,
	readyCounts map[string]containerReadyCounts,
) []inframonitoringtypes.ContainerRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.ContainerRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)

		record := inframonitoringtypes.ContainerRecord{ // initialize with default values
			PodUID:                   labels[podUIDAttrKey],
			ContainerName:            labels[containerNameAttrKey],
			Status:                   inframonitoringtypes.ContainerStatusNoData,
			Ready:                    inframonitoringtypes.ContainerReadyNoData,
			Restarts:                 -1,
			CPU:                      -1,
			CPURequestUtilization:    -1,
			CPULimitUtilization:      -1,
			Memory:                   -1,
			MemoryRequestUtilization: -1,
			MemoryLimitUtilization:   -1,
			Meta:                     map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.CPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.CPURequestUtilization = v
			}
			if v, exists := metrics["C"]; exists {
				record.CPULimitUtilization = v
			}
			if v, exists := metrics["D"]; exists {
				record.Memory = v
			}
			if v, exists := metrics["E"]; exists {
				record.MemoryRequestUtilization = v
			}
			if v, exists := metrics["F"]; exists {
				record.MemoryLimitUtilization = v
			}
		}

		if statusCountsForGroup, ok := statusCounts[compositeKey]; ok {
			record.ContainerCountsByStatus = containerStatusCountsToResponse(statusCountsForGroup)

			// In list mode each group is one container; the count==1 bucket identifies the status.
			if isContainerNameAndPodUIDInGroupBy {
				switch {
				case statusCountsForGroup.Running == 1:
					record.Status = inframonitoringtypes.ContainerStatusRunning
				case statusCountsForGroup.Waiting == 1:
					record.Status = inframonitoringtypes.ContainerStatusWaiting
				case statusCountsForGroup.Terminated == 1:
					record.Status = inframonitoringtypes.ContainerStatusTerminated
				case statusCountsForGroup.CrashLoopBackOff == 1:
					record.Status = inframonitoringtypes.ContainerStatusCrashLoopBackOff
				case statusCountsForGroup.ImagePullBackOff == 1:
					record.Status = inframonitoringtypes.ContainerStatusImagePullBackOff
				case statusCountsForGroup.ErrImagePull == 1:
					record.Status = inframonitoringtypes.ContainerStatusErrImagePull
				case statusCountsForGroup.CreateContainerConfigError == 1:
					record.Status = inframonitoringtypes.ContainerStatusCreateContainerConfigError
				case statusCountsForGroup.ContainerCreating == 1:
					record.Status = inframonitoringtypes.ContainerStatusContainerCreating
				case statusCountsForGroup.OOMKilled == 1:
					record.Status = inframonitoringtypes.ContainerStatusOOMKilled
				case statusCountsForGroup.Completed == 1:
					record.Status = inframonitoringtypes.ContainerStatusCompleted
				case statusCountsForGroup.Error == 1:
					record.Status = inframonitoringtypes.ContainerStatusError
				case statusCountsForGroup.ContainerCannotRun == 1:
					record.Status = inframonitoringtypes.ContainerStatusContainerCannotRun
				case statusCountsForGroup.Unknown == 1:
					record.Status = inframonitoringtypes.ContainerStatusUnknown
				}
			}
		}

		// Restart count: container's own count (list mode) or group sum (grouped mode).
		if restartCountForGroup, ok := restartCounts[compositeKey]; ok {
			record.Restarts = restartCountForGroup
		}

		if readyCountsForGroup, ok := readyCounts[compositeKey]; ok {
			record.ContainerCountsByReady = containerReadyCountsToResponse(readyCountsForGroup)

			// In list mode each group is one container; exactly one of ready/not_ready is 1.
			if isContainerNameAndPodUIDInGroupBy {
				switch {
				case readyCountsForGroup.Ready == 1:
					record.Ready = inframonitoringtypes.ContainerReadyReady
				case readyCountsForGroup.NotReady == 1:
					record.Ready = inframonitoringtypes.ContainerReadyNotReady
				}
			}
		}

		if attrs, ok := metadataMap[compositeKey]; ok {
			for k, v := range attrs {
				record.Meta[k] = v
			}
		}

		records = append(records, record)
	}
	return records
}

func (m *module) getTopContainerGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableContainers,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	if orderByKey == inframonitoringtypes.ContainerNameAttrKey {
		return inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.ContainerNameAttrKey), nil
	}
	queryNamesForOrderBy := orderByToContainersQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newContainersTableListQuery().CompositeQuery.Queries {
		if !slices.Contains(queryNamesForOrderBy, envelope.GetQueryName()) {
			continue
		}
		copied := envelope
		if copied.Type == qbtypes.QueryTypeBuilder {
			existingExpr := ""
			if f := copied.GetFilter(); f != nil {
				existingExpr = f.Expression
			}
			reqFilterExpr := ""
			if req.Filter != nil {
				reqFilterExpr = req.Filter.Expression
			}
			merged := mergeFilterExpressions(existingExpr, reqFilterExpr)
			copied.SetFilter(&qbtypes.Filter{Expression: merged})
			copied.SetGroupBy(req.GroupBy)
		}
		topReq.CompositeQuery.Queries = append(topReq.CompositeQuery.Queries, copied)
	}

	resp, err := m.querier.QueryRange(ctx, orgID, topReq)
	if err != nil {
		return nil, err
	}

	allMetricGroups := parseAndSortGroups(resp, rankingQueryName, req.GroupBy, req.OrderBy.Direction)
	return paginateWithBackfill(allMetricGroups, metadataMap, req.GroupBy, req.Offset, req.Limit), nil
}

func (m *module) getContainersTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableContainers) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range containerAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, orgID, containersTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}

// getPerGroupContainerStatusCountsWithReqMetricChecks gates
// getPerGroupContainerStatusCounts on the required metrics being present. If
// either of containerStatusMetricNamesList (k8s.container.status.state /
// k8s.container.status.reason) has never been reported, it skips the query and
// returns a warning instead (the status derivation needs both). Otherwise it
// runs the query. The returned counts map is empty (never nil) when gated off.
func (m *module) getPerGroupContainerStatusCountsWithReqMetricChecks(
	ctx context.Context,
	orgID valuer.UUID,
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

	counts, err := m.getPerGroupContainerStatusCounts(ctx, orgID, start, end, filter, groupBy, pageGroups)
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
//	reason_fps / container_reason: current active k8s.container.status.reason per container
//	                               (two-level: HAVING is_active=1 excludes stale reasons of
//	                               recovered containers, then recency picks the latest).
//	container_status:              display status per container (reason > state fallback).
//	countContainersPerStatus:      per-group uniqExactIf over distinct (pod_uid, container_name).
//
// Groups absent from the result map have implicit zero counts (caller default).
func (m *module) getPerGroupContainerStatusCounts(
	ctx context.Context,
	orgID valuer.UUID,
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
		filterClause, err = m.buildFilterClause(ctx, orgID, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
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
	// from old container incarnations; keep only active (=1). Outer: the current
	// incarnation's reason wins via recency (argMax by last_active_ms). We do NOT
	// priority-rank reasons at container grain -- "worst wins" is a pod-level concept
	// (aggregating multiple containers into one status); a single container has one
	// reason at a time, and multiple only appear active via container.id churn on
	// restart, where the latest (current) incarnation is the right answer.
	reasonInner := sqlbuilder.NewSelectBuilder()
	reasonInner.Select(
		"fps.pod_uid AS pod_uid",
		"fps.container_name AS container_name",
		"fps.reason AS reason",
		fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS is_active", valueCol),
		"max(samples.unix_milli) AS last_active_ms",
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
		"SELECT pod_uid, container_name, argMax(reason, last_active_ms) AS active_reason FROM (%s) GROUP BY pod_uid, container_name",
		reasonInnerSQL,
	)

	// ----- container_status (display status per container) -----
	// container reason > state fallback (running/terminated/waiting).
	displayStatusExpr := `multiIf(
		cr.active_reason != '', cr.active_reason,
		st.state = 'running', 'Running',
		st.state = 'terminated', 'Terminated',
		st.state = 'waiting', 'Waiting',
		'Unknown')`
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
		"SELECT %s FROM container_state AS st LEFT JOIN container_reason AS cr ON st.pod_uid = cr.pod_uid AND st.container_name = cr.container_name",
		strings.Join(containerStatusSelectCols, ", "),
	)

	// ----- countContainersPerStatus (outer SELECT) -----
	// Fixed status order; MUST match the containerStatusCounts assignment below.
	statusCountCols := []string{
		"uniqExactIf((pod_uid, container_name), display_status = 'Running') AS running_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'Waiting') AS waiting_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'Terminated') AS terminated_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'CrashLoopBackOff') AS crash_loop_back_off_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'ImagePullBackOff') AS image_pull_back_off_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'ErrImagePull') AS err_image_pull_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'CreateContainerConfigError') AS create_container_config_error_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'ContainerCreating') AS container_creating_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'OOMKilled') AS oom_killed_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'Completed') AS completed_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'Error') AS error_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'ContainerCannotRun') AS container_cannot_run_count",
		"uniqExactIf((pod_uid, container_name), display_status = 'Unknown') AS unknown_count",
	}
	countSelectCols := make([]string, 0, len(groupBy)+len(statusCountCols))
	countGroupBy := make([]string, 0, len(groupBy))
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		countSelectCols = append(countSelectCols, col)
		countGroupBy = append(countGroupBy, col)
	}
	countSelectCols = append(countSelectCols, statusCountCols...)
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
		counts := make([]uint64, len(statusCountCols))
		scanPtrs := make([]any, 0, len(groupBy)+len(statusCountCols))
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
	orgID valuer.UUID,
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
		filterClause, err = m.buildFilterClause(ctx, orgID, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
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
	orgID valuer.UUID,
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
		filterClause, err = m.buildFilterClause(ctx, orgID, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
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
