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
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
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

		if attrs, ok := metadataMap[compositeKey]; ok && isPodUIDInGroupBy {
			// the condition above ensures we deduce age only if pod uid is in group by because if
			// it's not in group by then we might have multiple pod uids in the same group and hence then podAge wont make sense
			if startTimeStr, exists := attrs[podStartTimeAttrKey]; exists && startTimeStr != "" {
				if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
					startTimeMs := t.UnixMilli()
					if startTimeMs > 0 {
						record.PodAge = reqEnd - startTimeMs
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

func (m *module) getPodsTableMetadata(ctx context.Context, req *inframonitoringtypes.PostablePods) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range podAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, podsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
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
	req *inframonitoringtypes.PostablePods,
	pageGroups []map[string]string,
) (map[string]podPhaseCounts, error) {
	if len(pageGroups) == 0 || len(req.GroupBy) == 0 {
		return map[string]podPhaseCounts{}, nil
	}

	// Merged filter expression (user filter + page-groups IN clauses).
	reqFilterExpr := ""
	if req.Filter != nil {
		reqFilterExpr = req.Filter.Expression
	}
	pageGroupsFilterExpr := buildPageGroupsFilterExpr(pageGroups)
	filterExpr := mergeFilterExpressions(reqFilterExpr, pageGroupsFilterExpr)

	// Resolve tables. Same convention as hosts (distributed names from helpers).
	adjustedStart, adjustedEnd, _, localTimeSeriesTable := telemetrymetrics.WhichTSTableToUse(
		uint64(req.Start), uint64(req.End), nil,
	)
	samplesTable := telemetrymetrics.WhichSamplesTableToUse(
		uint64(req.Start), uint64(req.End),
		metrictypes.UnspecifiedType, metrictypes.TimeAggregationUnspecified, nil,
	)
	valueCol := telemetrymetrics.ValueColumnForSamplesTable(samplesTable)

	// ----- timeSeriesFPs -----
	timeSeriesFPs := sqlbuilder.NewSelectBuilder()
	timeSeriesFPsSelectCols := []string{
		"fingerprint",
		fmt.Sprintf("JSONExtractString(labels, %s) AS pod_uid", timeSeriesFPs.Var(podUIDAttrKey)),
	}
	for _, key := range req.GroupBy {
		timeSeriesFPsSelectCols = append(timeSeriesFPsSelectCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", timeSeriesFPs.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	timeSeriesFPs.Select(timeSeriesFPsSelectCols...)
	timeSeriesFPs.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	timeSeriesFPs.Where(
		timeSeriesFPs.E("metric_name", podPhaseMetricName),
		timeSeriesFPs.GE("unix_milli", adjustedStart),
		timeSeriesFPs.L("unix_milli", adjustedEnd),
	)
	if filterExpr != "" {
		filterClause, err := m.buildFilterClause(ctx, &qbtypes.Filter{Expression: filterExpr}, req.Start, req.End)
		if err != nil {
			return nil, err
		}
		if filterClause != nil {
			timeSeriesFPs.AddWhereClause(filterClause)
		}
	}
	timeSeriesFPsGroupBy := []string{"fingerprint", "pod_uid"}
	for _, key := range req.GroupBy {
		timeSeriesFPsGroupBy = append(timeSeriesFPsGroupBy, quoteIdentifier(key.Name))
	}
	timeSeriesFPs.GroupBy(timeSeriesFPsGroupBy...)
	timeSeriesFPsSQL, timeSeriesFPsArgs := timeSeriesFPs.BuildWithFlavor(sqlbuilder.ClickHouse)

	latestPhasePerPod := sqlbuilder.NewSelectBuilder()
	latestPhasePerPodSelectCols := []string{"tsfp.pod_uid AS pod_uid"}
	latestPhasePerPodGroupBy := []string{"pod_uid"}
	for _, key := range req.GroupBy {
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
		telemetrymetrics.DBName, samplesTable,
	))
	latestPhasePerPod.Where(
		latestPhasePerPod.E("samples.metric_name", podPhaseMetricName),
		latestPhasePerPod.GE("samples.unix_milli", req.Start),
		latestPhasePerPod.L("samples.unix_milli", req.End),
		"tsfp.pod_uid != ''",
	)
	latestPhasePerPod.GroupBy(latestPhasePerPodGroupBy...)
	latestPhasePerPodSQL, latestPhasePerPodArgs := latestPhasePerPod.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- countPodsPerPhase (outer SELECT) -----
	countPodsPerPhaseSelectCols := make([]string, 0, len(req.GroupBy)+5)
	countPodsPerPhaseGroupBy := make([]string, 0, len(req.GroupBy))
	for _, key := range req.GroupBy {
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
		groupVals := make([]string, len(req.GroupBy))
		scanPtrs := make([]any, 0, len(req.GroupBy)+5)
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
