package implinframonitoring

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// buildPodRecords assembles the page records. Phase counts come from
// phaseCounts in both modes. In list mode (isPodUIDInGroupBy=true) each
// group is one pod, so exactly one count is 1; PodPhase is derived from
// which one. In grouped_list mode PodPhase stays PodPhaseNoData.
func buildPodRecords(
	isPodUIDInGroupBy bool,
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	phaseCounts map[string]podPhaseCounts,
	statusCounts map[string]podStatusCounts,
	restartCounts map[string]int64,
	reqEnd int64,
) []inframonitoringtypes.PodRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.PodRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		podUID := labels[podUIDAttrKey]

		record := inframonitoringtypes.PodRecord{ // initialize with default values
			PodUID:           podUID,
			PodPhase:         inframonitoringtypes.PodPhaseNoData,
			PodStatus:        inframonitoringtypes.PodStatusNoData,
			PodRestarts:      -1,
			PodCPU:           -1,
			PodCPURequest:    -1,
			PodCPULimit:      -1,
			PodMemory:        -1,
			PodMemoryRequest: -1,
			PodMemoryLimit:   -1,
			PodAge:           -1,
			Meta:             map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.PodCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.PodCPURequest = v
			}
			if v, exists := metrics["C"]; exists {
				record.PodCPULimit = v
			}
			if v, exists := metrics["D"]; exists {
				record.PodMemory = v
			}
			if v, exists := metrics["E"]; exists {
				record.PodMemoryRequest = v
			}
			if v, exists := metrics["F"]; exists {
				record.PodMemoryLimit = v
			}
		}

		if phaseCountsForGroup, ok := phaseCounts[compositeKey]; ok {
			record.PodCountsByPhase = inframonitoringtypes.PodCountsByPhase{
				Pending:   phaseCountsForGroup.Pending,
				Running:   phaseCountsForGroup.Running,
				Succeeded: phaseCountsForGroup.Succeeded,
				Failed:    phaseCountsForGroup.Failed,
				Unknown:   phaseCountsForGroup.Unknown,
			}

			// In list mode each group is one pod; the count==1 bucket identifies the phase.
			if isPodUIDInGroupBy {
				switch {
				case phaseCountsForGroup.Pending == 1:
					record.PodPhase = inframonitoringtypes.PodPhasePending
				case phaseCountsForGroup.Running == 1:
					record.PodPhase = inframonitoringtypes.PodPhaseRunning
				case phaseCountsForGroup.Succeeded == 1:
					record.PodPhase = inframonitoringtypes.PodPhaseSucceeded
				case phaseCountsForGroup.Failed == 1:
					record.PodPhase = inframonitoringtypes.PodPhaseFailed
				case phaseCountsForGroup.Unknown == 1:
					record.PodPhase = inframonitoringtypes.PodPhaseUnknown
				}
			}
		}

		if statusCountsForGroup, ok := statusCounts[compositeKey]; ok {
			record.PodCountsByStatus = podStatusCountsToResponse(statusCountsForGroup)

			// In list mode each group is one pod; the count==1 bucket identifies the status.
			if isPodUIDInGroupBy {
				switch {
				case statusCountsForGroup.Pending == 1:
					record.PodStatus = inframonitoringtypes.PodStatusPending
				case statusCountsForGroup.Running == 1:
					record.PodStatus = inframonitoringtypes.PodStatusRunning
				case statusCountsForGroup.Failed == 1:
					record.PodStatus = inframonitoringtypes.PodStatusFailed
				case statusCountsForGroup.Unknown == 1:
					record.PodStatus = inframonitoringtypes.PodStatusUnknown
				case statusCountsForGroup.CrashLoopBackOff == 1:
					record.PodStatus = inframonitoringtypes.PodStatusCrashLoopBackOff
				case statusCountsForGroup.ImagePullBackOff == 1:
					record.PodStatus = inframonitoringtypes.PodStatusImagePullBackOff
				case statusCountsForGroup.ErrImagePull == 1:
					record.PodStatus = inframonitoringtypes.PodStatusErrImagePull
				case statusCountsForGroup.CreateContainerConfigError == 1:
					record.PodStatus = inframonitoringtypes.PodStatusCreateContainerConfigError
				case statusCountsForGroup.ContainerCreating == 1:
					record.PodStatus = inframonitoringtypes.PodStatusContainerCreating
				case statusCountsForGroup.OOMKilled == 1:
					record.PodStatus = inframonitoringtypes.PodStatusOOMKilled
				case statusCountsForGroup.Completed == 1:
					record.PodStatus = inframonitoringtypes.PodStatusCompleted
				case statusCountsForGroup.Error == 1:
					record.PodStatus = inframonitoringtypes.PodStatusError
				case statusCountsForGroup.ContainerCannotRun == 1:
					record.PodStatus = inframonitoringtypes.PodStatusContainerCannotRun
				case statusCountsForGroup.Evicted == 1:
					record.PodStatus = inframonitoringtypes.PodStatusEvicted
				case statusCountsForGroup.NodeAffinity == 1:
					record.PodStatus = inframonitoringtypes.PodStatusNodeAffinity
				case statusCountsForGroup.NodeLost == 1:
					record.PodStatus = inframonitoringtypes.PodStatusNodeLost
				case statusCountsForGroup.Shutdown == 1:
					record.PodStatus = inframonitoringtypes.PodStatusShutdown
				case statusCountsForGroup.UnexpectedAdmissionError == 1:
					record.PodStatus = inframonitoringtypes.PodStatusUnexpectedAdmissionError
				}
			}
		}

		// Restart count: pod's own sum (list mode) or group total (grouped mode).
		if restartCountForGroup, ok := restartCounts[compositeKey]; ok {
			record.PodRestarts = restartCountForGroup
		}

		if attrs, ok := metadataMap[compositeKey]; ok {
			// podAge only makes sense when pod uid is in groupBy. Otherwise the
			// group can contain multiple pods with different start times.
			if isPodUIDInGroupBy {
				if startTimeStr, exists := attrs[podStartTimeAttrKey]; exists && startTimeStr != "" {
					if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
						startTimeMs := t.UnixMilli()
						if startTimeMs > 0 {
							record.PodAge = reqEnd - startTimeMs
						}
					}
				}
			}
			for k, v := range attrs {
				record.Meta[k] = v
			}
		}

		records = append(records, record)
	}
	return records
}

func (m *module) getTopPodGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostablePods,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	if orderByKey == inframonitoringtypes.PodNameAttrKey {
		return inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.PodNameAttrKey), nil
	}
	queryNamesForOrderBy := orderByToPodsQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newPodsTableListQuery().CompositeQuery.Queries {
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

func (m *module) getPodsTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostablePods) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range podAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, orgID, podsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}

// getPerGroupPodPhaseCounts computes per-group pod counts bucketed by each
// pod's latest phase in the requested window.
// Pipeline:
//
//	timeSeriesFPs:      fp ↔ (pod_uid, groupBy cols) from the time_series table.
//	                    User filter + page-groups filter applied here.
//	latestPhasePerPod:  INNER JOIN samples × timeSeriesFPs, collapsed to
//	                    the latest phase per pod via argMax(value, unix_milli).
//	countPodsPerPhase:  per-group uniqExactIf into 5 phase buckets.
//
// Groups absent from the result map have implicit zero counts (caller default).
func (m *module) getPerGroupPodPhaseCounts(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]podPhaseCounts, error) {
	if len(pageGroups) == 0 || len(groupBy) == 0 {
		return map[string]podPhaseCounts{}, nil
	}

	// Merge user filter with page-groups IN clauses.
	userFilterExpr := ""
	if filter != nil {
		userFilterExpr = filter.Expression
	}
	pageGroupsFilterExpr := buildPageGroupsFilterExpr(pageGroups)
	mergedFilterExpr := mergeFilterExpressions(userFilterExpr, pageGroupsFilterExpr)

	// Step-floor bounds + resolve tables in one shot to match QB v5 querier.
	samplesStartMs, flooredEndMs, tsAdjustedStart, _, localTimeSeriesTable, distributedSamplesTable, _ := alignedMetricWindow(start, end)
	valueCol := telemetrymetrics.ValueColumnForSamplesTable(distributedSamplesTable)

	// ----- timeSeriesFPs -----
	timeSeriesFPs := sqlbuilder.NewSelectBuilder()
	timeSeriesFPsSelectCols := []string{
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", timeSeriesFPs.Var(podUIDAttrKey)),
	}
	for _, key := range groupBy {
		timeSeriesFPsSelectCols = append(timeSeriesFPsSelectCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", timeSeriesFPs.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	timeSeriesFPs.Select(timeSeriesFPsSelectCols...)
	timeSeriesFPs.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	timeSeriesFPs.Where(
		timeSeriesFPs.E("metric_name", podPhaseMetricName),
		timeSeriesFPs.GE("unix_milli", tsAdjustedStart),
		timeSeriesFPs.LE("unix_milli", flooredEndMs),
	)
	if mergedFilterExpr != "" {
		filterClause, err := m.buildFilterClause(ctx, &qbtypes.Filter{Expression: mergedFilterExpr}, start, end)
		if err != nil {
			return nil, err
		}
		if filterClause != nil {
			timeSeriesFPs.AddWhereClause(filterClause)
		}
	}
	timeSeriesFPsGroupBy := []string{"fingerprint", "pod_uid"}
	for _, key := range groupBy {
		timeSeriesFPsGroupBy = append(timeSeriesFPsGroupBy, quoteIdentifier(key.Name))
	}
	timeSeriesFPs.GroupBy(timeSeriesFPsGroupBy...)
	timeSeriesFPsSQL, timeSeriesFPsArgs := timeSeriesFPs.BuildWithFlavor(sqlbuilder.ClickHouse)

	latestPhasePerPod := sqlbuilder.NewSelectBuilder()
	latestPhasePerPodSelectCols := []string{"tsfp.pod_uid AS pod_uid"}
	latestPhasePerPodGroupBy := []string{"pod_uid"}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		latestPhasePerPodSelectCols = append(latestPhasePerPodSelectCols, fmt.Sprintf("tsfp.%s AS %s", col, col))
		latestPhasePerPodGroupBy = append(latestPhasePerPodGroupBy, col)
	}
	latestPhasePerPodSelectCols = append(latestPhasePerPodSelectCols,
		fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS phase_value", valueCol),
	)
	latestPhasePerPod.Select(latestPhasePerPodSelectCols...)
	latestPhasePerPod.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN time_series_fps AS tsfp ON samples.fingerprint = tsfp.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	latestPhasePerPod.Where(
		latestPhasePerPod.E("samples.metric_name", podPhaseMetricName),
		latestPhasePerPod.GE("samples.unix_milli", samplesStartMs),
		latestPhasePerPod.L("samples.unix_milli", flooredEndMs),
		"tsfp.pod_uid != ''",
	)
	latestPhasePerPod.GroupBy(latestPhasePerPodGroupBy...)
	latestPhasePerPodSQL, latestPhasePerPodArgs := latestPhasePerPod.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- countPodsPerPhase (outer SELECT) -----
	countPodsPerPhaseSelectCols := make([]string, 0, len(groupBy)+5)
	countPodsPerPhaseGroupBy := make([]string, 0, len(groupBy))
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		countPodsPerPhaseSelectCols = append(countPodsPerPhaseSelectCols, col)
		countPodsPerPhaseGroupBy = append(countPodsPerPhaseGroupBy, col)
	}
	countPodsPerPhaseSelectCols = append(countPodsPerPhaseSelectCols,
		fmt.Sprintf("uniqExactIf(pod_uid, phase_value = %d) AS pending_count", inframonitoringtypes.PodPhaseNumPending),
		fmt.Sprintf("uniqExactIf(pod_uid, phase_value = %d) AS running_count", inframonitoringtypes.PodPhaseNumRunning),
		fmt.Sprintf("uniqExactIf(pod_uid, phase_value = %d) AS succeeded_count", inframonitoringtypes.PodPhaseNumSucceeded),
		fmt.Sprintf("uniqExactIf(pod_uid, phase_value = %d) AS failed_count", inframonitoringtypes.PodPhaseNumFailed),
		fmt.Sprintf("uniqExactIf(pod_uid, phase_value = %d) AS unknown_count", inframonitoringtypes.PodPhaseNumUnknown),
	)
	countPodsPerPhaseSQL := fmt.Sprintf(
		"SELECT %s FROM latest_phase_per_pod GROUP BY %s",
		strings.Join(countPodsPerPhaseSelectCols, ", "),
		strings.Join(countPodsPerPhaseGroupBy, ", "),
	)

	// Combine CTEs + outer.
	cteFragments := []string{
		fmt.Sprintf("time_series_fps AS (%s)", timeSeriesFPsSQL),
		fmt.Sprintf("latest_phase_per_pod AS (%s)", latestPhasePerPodSQL),
	}
	finalSQL := querybuilder.CombineCTEs(cteFragments) + countPodsPerPhaseSQL
	finalArgs := querybuilder.PrependArgs([][]any{timeSeriesFPsArgs, latestPhasePerPodArgs}, nil)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, finalSQL, finalArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]podPhaseCounts)
	for rows.Next() {
		groupVals := make([]string, len(groupBy))
		scanPtrs := make([]any, 0, len(groupBy)+5)
		for i := range groupVals {
			scanPtrs = append(scanPtrs, &groupVals[i])
		}
		var pending, running, succeeded, failed, unknown uint64
		scanPtrs = append(scanPtrs, &pending, &running, &succeeded, &failed, &unknown)

		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}
		result[compositeKeyFromList(groupVals)] = podPhaseCounts{
			Pending:   int(pending),
			Running:   int(running),
			Succeeded: int(succeeded),
			Failed:    int(failed),
			Unknown:   int(unknown),
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// getPerGroupPodStatusCountsWithReqMetricChecks gates getPerGroupPodStatusCounts
// on the required metrics being present. If any of podStatusMetricNamesList has
// never been reported, it skips the query and returns a warning instead (the
// status query would otherwise silently degrade to bare phase). Otherwise it
// runs the query. The returned counts map is empty (never nil) when gated off.
func (m *module) getPerGroupPodStatusCountsWithReqMetricChecks(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]podStatusCounts, *qbtypes.QueryWarnData, error) {
	present, err := m.getMetricsExistence(ctx, podStatusMetricNamesList)
	if err != nil {
		return nil, nil, err
	}

	var missing []string
	for _, name := range podStatusMetricNamesList {
		if !present[name] {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		warning := &qbtypes.QueryWarnData{
			Message: fmt.Sprintf(
				"Pod status could not be computed: required metric(s) not found: %s. "+
					"Enable the optional k8s.pod.status_reason and k8s.container.status.reason "+
					"metrics in the k8s_cluster receiver to see pod statuses.",
				strings.Join(missing, ", "),
			),
			Url: docLinkK8sClusterReceiver,
		}
		return map[string]podStatusCounts{}, warning, nil
	}

	counts, err := m.getPerGroupPodStatusCounts(ctx, start, end, filter, groupBy, pageGroups)
	if err != nil {
		return nil, nil, err
	}
	return counts, nil, nil
}

// getPerGroupPodStatusCounts computes per-group pod counts bucketed by each
// pod's latest kubectl-style display status in the requested window. Caller
// must ensure the required metrics exist (getPerGroupPodStatusCountsWithReqMetricChecks).
// Pipeline (mirrors getPerGroupPodPhaseCounts, more CTEs):
//
//	phase_fps / phase_per_pod:           latest k8s.pod.phase per pod (+ groupBy cols).
//	pod_reason_fps / pod_reason_per_pod: latest k8s.pod.status_reason per pod.
//	container_reason_fps / container_reason_per_pod:
//	                                     highest-priority active k8s.container.status.reason per pod.
//	pod_status:                          display status per pod (container > pod reason > phase).
//	countPodsPerStatus:                  per-group uniqExactIf into the fixed status buckets.
//
// Groups absent from the result map have implicit zero counts (caller default).
func (m *module) getPerGroupPodStatusCounts(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]podStatusCounts, error) {
	if len(pageGroups) == 0 || len(groupBy) == 0 {
		return map[string]podStatusCounts{}, nil
	}

	// Merge user filter with page-groups IN clauses.
	userFilterExpr := ""
	if filter != nil {
		userFilterExpr = filter.Expression
	}
	mergedFilterExpr := mergeFilterExpressions(userFilterExpr, buildPageGroupsFilterExpr(pageGroups))

	samplesStartMs, flooredEndMs, tsAdjustedStart, _, localTimeSeriesTable, distributedSamplesTable, _ := alignedMetricWindow(start, end)
	valueCol := telemetrymetrics.ValueColumnForSamplesTable(distributedSamplesTable)

	// Build the merged filter clause once; it's identical across the three fps
	// CTEs, and buildFilterClause hits the metadata store + parses the
	// expression, so we don't want to repeat it per CTE. AddWhereClause only
	// reads the clause, so the same instance is safe to attach to each builder.
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

	// ----- phase_fps (carries groupBy cols) -----
	phaseFps := sqlbuilder.NewSelectBuilder()
	phaseFpsCols := []string{
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", phaseFps.Var(podUIDAttrKey)),
	}
	for _, key := range groupBy {
		phaseFpsCols = append(phaseFpsCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", phaseFps.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	phaseFps.Select(phaseFpsCols...)
	phaseFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	phaseFps.Where(
		phaseFps.E("metric_name", podPhaseMetricName),
		phaseFps.GE("unix_milli", tsAdjustedStart),
		phaseFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		phaseFps.AddWhereClause(filterClause)
	}
	phaseFpsGroupBy := []string{"fingerprint", "pod_uid"}
	for _, key := range groupBy {
		phaseFpsGroupBy = append(phaseFpsGroupBy, quoteIdentifier(key.Name))
	}
	phaseFps.GroupBy(phaseFpsGroupBy...)
	phaseFpsSQL, phaseFpsArgs := phaseFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- phase_per_pod -----
	phasePerPod := sqlbuilder.NewSelectBuilder()
	phasePerPodCols := []string{"fps.pod_uid AS pod_uid"}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		phasePerPodCols = append(phasePerPodCols, fmt.Sprintf("argMax(fps.%s, samples.unix_milli) AS %s", col, col))
	}
	phasePerPodCols = append(phasePerPodCols, fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS phase_value", valueCol))
	phasePerPod.Select(phasePerPodCols...)
	phasePerPod.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN phase_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	phasePerPod.Where(
		phasePerPod.E("samples.metric_name", podPhaseMetricName),
		phasePerPod.GE("samples.unix_milli", samplesStartMs),
		phasePerPod.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	phasePerPod.GroupBy("pod_uid")
	phasePerPodSQL, phasePerPodArgs := phasePerPod.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- pod_reason_fps -----
	podReasonFps := sqlbuilder.NewSelectBuilder()
	podReasonFps.Select(
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", podReasonFps.Var(podUIDAttrKey)),
	)
	podReasonFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	podReasonFps.Where(
		podReasonFps.E("metric_name", podStatusReasonMetricName),
		podReasonFps.GE("unix_milli", tsAdjustedStart),
		podReasonFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		podReasonFps.AddWhereClause(filterClause)
	}
	podReasonFps.GroupBy("fingerprint", "pod_uid")
	podReasonFpsSQL, podReasonFpsArgs := podReasonFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- pod_reason_per_pod -----
	podReasonPerPod := sqlbuilder.NewSelectBuilder()
	podReasonPerPod.Select(
		"fps.pod_uid AS pod_uid",
		fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS reason_value", valueCol),
	)
	podReasonPerPod.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN pod_reason_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	podReasonPerPod.Where(
		podReasonPerPod.E("samples.metric_name", podStatusReasonMetricName),
		podReasonPerPod.GE("samples.unix_milli", samplesStartMs),
		podReasonPerPod.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	podReasonPerPod.GroupBy("pod_uid")
	podReasonPerPodSQL, podReasonPerPodArgs := podReasonPerPod.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- container_reason_fps -----
	containerReasonFps := sqlbuilder.NewSelectBuilder()
	containerReasonFps.Select(
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", containerReasonFps.Var(podUIDAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS container_name", containerReasonFps.Var(containerNameAttrKey)),
		fmt.Sprintf("JSONExtractString(labels, %s) AS reason", containerReasonFps.Var(containerStatusReasonAttrKey)),
	)
	containerReasonFps.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	containerReasonFps.Where(
		containerReasonFps.E("metric_name", containerStatusReasonMetricName),
		containerReasonFps.GE("unix_milli", tsAdjustedStart),
		containerReasonFps.LE("unix_milli", flooredEndMs),
	)
	if filterClause != nil {
		containerReasonFps.AddWhereClause(filterClause)
	}
	containerReasonFps.GroupBy("fingerprint", "pod_uid", "container_name", "reason")
	containerReasonFpsSQL, containerReasonFpsArgs := containerReasonFps.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- container_reason_per_pod -----
	// Inner: latest value per (pod, container, reason) -> kills stale
	// fingerprints from old container incarnations; keep only active (=1).
	// Outer: highest-priority active reason per pod (waiting > terminated).
	priorityCase := "CASE fps.reason " +
		"WHEN 'CrashLoopBackOff' THEN 8 " +
		"WHEN 'ImagePullBackOff' THEN 7 " +
		"WHEN 'ErrImagePull' THEN 6 " +
		"WHEN 'CreateContainerConfigError' THEN 5 " +
		"WHEN 'ContainerCreating' THEN 4 " +
		"WHEN 'OOMKilled' THEN 3 " +
		"WHEN 'Error' THEN 2 " +
		"WHEN 'ContainerCannotRun' THEN 1 " +
		"ELSE 0 END"
	containerInner := sqlbuilder.NewSelectBuilder()
	containerInner.Select(
		"fps.pod_uid AS pod_uid",
		"fps.container_name AS container_name",
		"fps.reason AS reason",
		fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS is_active", valueCol),
		priorityCase+" AS priority",
	)
	containerInner.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN container_reason_fps AS fps ON samples.fingerprint = fps.fingerprint",
		telemetrymetrics.DBName, distributedSamplesTable,
	))
	containerInner.Where(
		containerInner.E("samples.metric_name", containerStatusReasonMetricName),
		containerInner.GE("samples.unix_milli", samplesStartMs),
		containerInner.L("samples.unix_milli", flooredEndMs),
		"fps.pod_uid != ''",
	)
	containerInner.GroupBy("fps.pod_uid", "fps.container_name", "fps.reason")
	containerInner.Having("is_active = 1")
	containerInnerSQL, containerInnerArgs := containerInner.BuildWithFlavor(sqlbuilder.ClickHouse)
	containerPerPodSQL := fmt.Sprintf(
		"SELECT pod_uid, argMax(reason, priority) AS active_reason FROM (%s) GROUP BY pod_uid",
		containerInnerSQL,
	)

	// ----- pod_status (display status per pod) -----
	// container reason > pod-level reason > phase fallback. Numeric literals
	// match the k8s.pod.status_reason and k8s.pod.phase metric encodings.
	displayStatusExpr := "multiIf(" +
		"cr.active_reason != '', cr.active_reason, " +
		"pr.reason_value = 1, 'Evicted', " +
		"pr.reason_value = 2, 'NodeAffinity', " +
		"pr.reason_value = 3, 'NodeLost', " +
		"pr.reason_value = 4, 'Shutdown', " +
		"pr.reason_value = 5, 'UnexpectedAdmissionError', " +
		"pp.phase_value = 1, 'Pending', " +
		"pp.phase_value = 2, 'Running', " +
		"pp.phase_value = 3, 'Completed', " +
		"pp.phase_value = 4, 'Failed', " +
		"pp.phase_value = 5, 'Unknown', " +
		"'Unknown')"
	podStatusSelectCols := []string{"pp.pod_uid AS pod_uid"}
	for _, key := range groupBy {
		col := quoteIdentifier(key.Name)
		podStatusSelectCols = append(podStatusSelectCols, fmt.Sprintf("pp.%s AS %s", col, col))
	}
	podStatusSelectCols = append(podStatusSelectCols, displayStatusExpr+" AS display_status")
	podStatusSQL := fmt.Sprintf(
		"SELECT %s FROM phase_per_pod AS pp "+
			"LEFT JOIN pod_reason_per_pod AS pr ON pp.pod_uid = pr.pod_uid "+
			"LEFT JOIN container_reason_per_pod AS cr ON pp.pod_uid = cr.pod_uid",
		strings.Join(podStatusSelectCols, ", "),
	)

	// ----- countPodsPerStatus (outer SELECT) -----
	// Fixed status order; MUST match the podStatusCounts assignment in the
	// scan loop below.
	statusCountCols := []string{
		"uniqExactIf(pod_uid, display_status = 'Pending') AS pending_count",
		"uniqExactIf(pod_uid, display_status = 'Running') AS running_count",
		"uniqExactIf(pod_uid, display_status = 'Failed') AS failed_count",
		"uniqExactIf(pod_uid, display_status = 'Unknown') AS unknown_count",
		"uniqExactIf(pod_uid, display_status = 'CrashLoopBackOff') AS crash_loop_back_off_count",
		"uniqExactIf(pod_uid, display_status = 'ImagePullBackOff') AS image_pull_back_off_count",
		"uniqExactIf(pod_uid, display_status = 'ErrImagePull') AS err_image_pull_count",
		"uniqExactIf(pod_uid, display_status = 'CreateContainerConfigError') AS create_container_config_error_count",
		"uniqExactIf(pod_uid, display_status = 'ContainerCreating') AS container_creating_count",
		"uniqExactIf(pod_uid, display_status = 'OOMKilled') AS oom_killed_count",
		"uniqExactIf(pod_uid, display_status = 'Completed') AS completed_count",
		"uniqExactIf(pod_uid, display_status = 'Error') AS error_count",
		"uniqExactIf(pod_uid, display_status = 'ContainerCannotRun') AS container_cannot_run_count",
		"uniqExactIf(pod_uid, display_status = 'Evicted') AS evicted_count",
		"uniqExactIf(pod_uid, display_status = 'NodeAffinity') AS node_affinity_count",
		"uniqExactIf(pod_uid, display_status = 'NodeLost') AS node_lost_count",
		"uniqExactIf(pod_uid, display_status = 'Shutdown') AS shutdown_count",
		"uniqExactIf(pod_uid, display_status = 'UnexpectedAdmissionError') AS unexpected_admission_error_count",
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
		"SELECT %s FROM pod_status GROUP BY %s",
		strings.Join(countSelectCols, ", "),
		strings.Join(countGroupBy, ", "),
	)

	// Combine CTEs + outer. Arg order mirrors CTE declaration order.
	cteFragments := []string{
		fmt.Sprintf("phase_fps AS (%s)", phaseFpsSQL),
		fmt.Sprintf("phase_per_pod AS (%s)", phasePerPodSQL),
		fmt.Sprintf("pod_reason_fps AS (%s)", podReasonFpsSQL),
		fmt.Sprintf("pod_reason_per_pod AS (%s)", podReasonPerPodSQL),
		fmt.Sprintf("container_reason_fps AS (%s)", containerReasonFpsSQL),
		fmt.Sprintf("container_reason_per_pod AS (%s)", containerPerPodSQL),
		fmt.Sprintf("pod_status AS (%s)", podStatusSQL),
	}
	finalSQL := querybuilder.CombineCTEs(cteFragments) + countSQL
	finalArgs := querybuilder.PrependArgs([][]any{
		phaseFpsArgs, phasePerPodArgs,
		podReasonFpsArgs, podReasonPerPodArgs,
		containerReasonFpsArgs, containerInnerArgs,
	}, nil)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, finalSQL, finalArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]podStatusCounts)
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
		result[compositeKeyFromList(groupVals)] = podStatusCounts{
			Pending:                    int(counts[0]),
			Running:                    int(counts[1]),
			Failed:                     int(counts[2]),
			Unknown:                    int(counts[3]),
			CrashLoopBackOff:           int(counts[4]),
			ImagePullBackOff:           int(counts[5]),
			ErrImagePull:               int(counts[6]),
			CreateContainerConfigError: int(counts[7]),
			ContainerCreating:          int(counts[8]),
			OOMKilled:                  int(counts[9]),
			Completed:                  int(counts[10]),
			Error:                      int(counts[11]),
			ContainerCannotRun:         int(counts[12]),
			Evicted:                    int(counts[13]),
			NodeAffinity:               int(counts[14]),
			NodeLost:                   int(counts[15]),
			Shutdown:                   int(counts[16]),
			UnexpectedAdmissionError:   int(counts[17]),
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// getPerGroupPodRestartCounts computes the absolute pod restart count per group
// from k8s.container.restarts (default-enabled, so no existence gate). In list
// mode (groupBy=pod_uid) each group is one pod -> its restart count; in grouped
// mode it's the summed restarts across all pods in the group. Mirrors DD:
// argMax(value, unix_milli) per (pod, container) takes the current cumulative
// count from the latest incarnation (handling fingerprint staleness/pruning),
// then sum.
//
//	restart_fps:        fp ↔ (pod_uid, container_name, groupBy cols) from time_series.
//	container_restarts: INNER JOIN samples, latest restartCount per (pod, container).
//	(outer):            per-group sum(restart_count).
//
// Groups absent from the result map have no data (caller default).
func (m *module) getPerGroupPodRestartCounts(
	ctx context.Context,
	start, end int64,
	filter *qbtypes.Filter,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
) (map[string]int64, error) {
	if len(pageGroups) == 0 || len(groupBy) == 0 {
		return map[string]int64{}, nil
	}

	// Merge user filter with page-groups IN clauses.
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

	// ----- outer: per-group sum across containers (hence across pods) -----
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
