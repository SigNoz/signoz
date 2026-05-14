package implinframonitoring

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// buildNodeRecords assembles the page records. Condition counts come from
// conditionCounts in both modes. In list mode (isNodeNameInGroupBy=true) each
// group is one node, so exactly one count is 1; Condition is derived from
// which one. In grouped_list mode Condition stays NodeConditionNoData.
func buildNodeRecords(
	isNodeNameInGroupBy bool,
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	nodeConditionCounts map[string]nodeConditionCounts,
	podPhaseCounts map[string]podPhaseCounts,
) []inframonitoringtypes.NodeRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.NodeRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		nodeName := labels[nodeNameAttrKey]

		record := inframonitoringtypes.NodeRecord{ // initialize with default values
			NodeName:              nodeName,
			Condition:             inframonitoringtypes.NodeConditionNoData,
			NodeCPU:               -1,
			NodeCPUAllocatable:    -1,
			NodeMemory:            -1,
			NodeMemoryAllocatable: -1,
			Meta:                  map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.NodeCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.NodeCPUAllocatable = v
			}
			if v, exists := metrics["C"]; exists {
				record.NodeMemory = v
			}
			if v, exists := metrics["D"]; exists {
				record.NodeMemoryAllocatable = v
			}
		}

		if nodeConditionCountsForGroup, ok := nodeConditionCounts[compositeKey]; ok {
			record.NodeCountsByReadiness = inframonitoringtypes.NodeCountsByReadiness{
				Ready:    nodeConditionCountsForGroup.Ready,
				NotReady: nodeConditionCountsForGroup.NotReady,
			}

			// In list mode each group is one node; the count==1 bucket identifies the condition.
			if isNodeNameInGroupBy {
				switch {
				case nodeConditionCountsForGroup.Ready == 1:
					record.Condition = inframonitoringtypes.NodeConditionReady
				case nodeConditionCountsForGroup.NotReady == 1:
					record.Condition = inframonitoringtypes.NodeConditionNotReady
				}
			}
		}

		if podPhaseCountsForGroup, ok := podPhaseCounts[compositeKey]; ok {
			record.PodCountsByPhase = inframonitoringtypes.PodCountsByPhase{
				Pending:   podPhaseCountsForGroup.Pending,
				Running:   podPhaseCountsForGroup.Running,
				Succeeded: podPhaseCountsForGroup.Succeeded,
				Failed:    podPhaseCountsForGroup.Failed,
				Unknown:   podPhaseCountsForGroup.Unknown,
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

func (m *module) getTopNodeGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableNodes,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	queryNamesForOrderBy := orderByToNodesQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newNodesTableListQuery().CompositeQuery.Queries {
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

func (m *module) getNodesTableMetadata(ctx context.Context, req *inframonitoringtypes.PostableNodes) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range nodeAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, nodesTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}

// getPerGroupNodeConditionCounts computes per-group node counts bucketed by each
// node's latest condition_ready value (0 / 1) in the requested window.
// Pipeline:
//
//	timeSeriesFPs:           fp ↔ (node_name, groupBy cols) from the time_series table.
//	                         User filter + page-groups filter applied here.
//	latestConditionPerNode:  INNER JOIN samples × timeSeriesFPs, collapsed to
//	                         the latest condition value per node via argMax(value, unix_milli).
//	countNodesPerCondition:  per-group uniqExactIf into ready/not_ready buckets.
//
// Groups absent from the result map have implicit zero counts (caller default).
func (m *module) getPerGroupNodeConditionCounts(
	ctx context.Context,
	req *inframonitoringtypes.PostableNodes,
	pageGroups []map[string]string,
) (map[string]nodeConditionCounts, error) {
	if len(pageGroups) == 0 || len(req.GroupBy) == 0 {
		return map[string]nodeConditionCounts{}, nil
	}

	// Merged filter expression (user filter + page-groups IN clauses).
	reqFilterExpr := ""
	if req.Filter != nil {
		reqFilterExpr = req.Filter.Expression
	}
	pageGroupsFilterExpr := buildPageGroupsFilterExpr(pageGroups)
	filterExpr := mergeFilterExpressions(reqFilterExpr, pageGroupsFilterExpr)

	// Resolve tables. Same convention as pods.
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
		fmt.Sprintf("JSONExtractString(labels, %s) AS node_name", timeSeriesFPs.Var(nodeNameAttrKey)),
	}
	for _, key := range req.GroupBy {
		timeSeriesFPsSelectCols = append(timeSeriesFPsSelectCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", timeSeriesFPs.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}
	timeSeriesFPs.Select(timeSeriesFPsSelectCols...)
	timeSeriesFPs.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTimeSeriesTable))
	timeSeriesFPs.Where(
		timeSeriesFPs.E("metric_name", nodeConditionMetricName),
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
	timeSeriesFPsGroupBy := []string{"fingerprint", "node_name"}
	for _, key := range req.GroupBy {
		timeSeriesFPsGroupBy = append(timeSeriesFPsGroupBy, quoteIdentifier(key.Name))
	}
	timeSeriesFPs.GroupBy(timeSeriesFPsGroupBy...)
	timeSeriesFPsSQL, timeSeriesFPsArgs := timeSeriesFPs.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- latestConditionPerNode -----
	latestConditionPerNode := sqlbuilder.NewSelectBuilder()
	latestConditionPerNodeSelectCols := []string{"tsfp.node_name AS node_name"}
	latestConditionPerNodeGroupBy := []string{"node_name"}
	for _, key := range req.GroupBy {
		col := quoteIdentifier(key.Name)
		latestConditionPerNodeSelectCols = append(latestConditionPerNodeSelectCols, fmt.Sprintf("tsfp.%s AS %s", col, col))
		latestConditionPerNodeGroupBy = append(latestConditionPerNodeGroupBy, col)
	}
	latestConditionPerNodeSelectCols = append(latestConditionPerNodeSelectCols,
		fmt.Sprintf("argMax(samples.%s, samples.unix_milli) AS condition_value", valueCol),
	)
	latestConditionPerNode.Select(latestConditionPerNodeSelectCols...)
	latestConditionPerNode.From(fmt.Sprintf(
		"%s.%s AS samples INNER JOIN time_series_fps AS tsfp ON samples.fingerprint = tsfp.fingerprint",
		telemetrymetrics.DBName, samplesTable,
	))
	latestConditionPerNode.Where(
		latestConditionPerNode.E("samples.metric_name", nodeConditionMetricName),
		latestConditionPerNode.GE("samples.unix_milli", req.Start),
		latestConditionPerNode.L("samples.unix_milli", req.End),
		"tsfp.node_name != ''",
	)
	latestConditionPerNode.GroupBy(latestConditionPerNodeGroupBy...)
	latestConditionPerNodeSQL, latestConditionPerNodeArgs := latestConditionPerNode.BuildWithFlavor(sqlbuilder.ClickHouse)

	// ----- countNodesPerCondition (outer SELECT) -----
	countNodesPerConditionSelectCols := make([]string, 0, len(req.GroupBy)+2)
	countNodesPerConditionGroupBy := make([]string, 0, len(req.GroupBy))
	for _, key := range req.GroupBy {
		col := quoteIdentifier(key.Name)
		countNodesPerConditionSelectCols = append(countNodesPerConditionSelectCols, col)
		countNodesPerConditionGroupBy = append(countNodesPerConditionGroupBy, col)
	}
	countNodesPerConditionSelectCols = append(countNodesPerConditionSelectCols,
		fmt.Sprintf("uniqExactIf(node_name, condition_value = %d) AS ready_count", inframonitoringtypes.NodeConditionNumReady),
		fmt.Sprintf("uniqExactIf(node_name, condition_value = %d) AS not_ready_count", inframonitoringtypes.NodeConditionNumNotReady),
	)
	countNodesPerConditionSQL := fmt.Sprintf(
		"SELECT %s FROM latest_condition_per_node GROUP BY %s",
		strings.Join(countNodesPerConditionSelectCols, ", "),
		strings.Join(countNodesPerConditionGroupBy, ", "),
	)

	// Combine CTEs + outer.
	cteFragments := []string{
		fmt.Sprintf("time_series_fps AS (%s)", timeSeriesFPsSQL),
		fmt.Sprintf("latest_condition_per_node AS (%s)", latestConditionPerNodeSQL),
	}
	finalSQL := querybuilder.CombineCTEs(cteFragments) + countNodesPerConditionSQL
	finalArgs := querybuilder.PrependArgs([][]any{timeSeriesFPsArgs, latestConditionPerNodeArgs}, nil)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, finalSQL, finalArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]nodeConditionCounts)
	for rows.Next() {
		groupVals := make([]string, len(req.GroupBy))
		scanPtrs := make([]any, 0, len(req.GroupBy)+2)
		for i := range groupVals {
			scanPtrs = append(scanPtrs, &groupVals[i])
		}
		var ready, notReady uint64
		scanPtrs = append(scanPtrs, &ready, &notReady)

		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}
		result[compositeKeyFromList(groupVals)] = nodeConditionCounts{
			Ready:    int(ready),
			NotReady: int(notReady),
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}
