package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// buildClusterRecords assembles the page records. Node condition counts and
// pod phase counts come from the respective per-group maps in both modes;
// every row is a group of nodes+pods, so there's no per-row "current state"
// concept (analogous to namespaces).
func buildClusterRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	nodeConditionCountsMap map[string]nodeConditionCounts,
	podPhaseCountsMap map[string]podPhaseCounts,
) []inframonitoringtypes.ClusterRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.ClusterRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		clusterName := labels[clusterNameAttrKey]

		record := inframonitoringtypes.ClusterRecord{ // initialize with default values
			ClusterName:              clusterName,
			ClusterCPU:               -1,
			ClusterCPUAllocatable:    -1,
			ClusterMemory:            -1,
			ClusterMemoryAllocatable: -1,
			Meta:                     map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.ClusterCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.ClusterCPUAllocatable = v
			}
			if v, exists := metrics["C"]; exists {
				record.ClusterMemory = v
			}
			if v, exists := metrics["D"]; exists {
				record.ClusterMemoryAllocatable = v
			}
		}

		if conditionCountsForGroup, ok := nodeConditionCountsMap[compositeKey]; ok {
			record.NodeCountsByReadiness = inframonitoringtypes.NodeCountsByReadiness{
				Ready:    conditionCountsForGroup.Ready,
				NotReady: conditionCountsForGroup.NotReady,
			}
		}

		if phaseCountsForGroup, ok := podPhaseCountsMap[compositeKey]; ok {
			record.PodCountsByPhase = inframonitoringtypes.PodCountsByPhase{
				Pending:   phaseCountsForGroup.Pending,
				Running:   phaseCountsForGroup.Running,
				Succeeded: phaseCountsForGroup.Succeeded,
				Failed:    phaseCountsForGroup.Failed,
				Unknown:   phaseCountsForGroup.Unknown,
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

func (m *module) getTopClusterGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableClusters,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	queryNamesForOrderBy := orderByToClustersQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newClustersTableListQuery().CompositeQuery.Queries {
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

func (m *module) getClustersTableMetadata(ctx context.Context, req *inframonitoringtypes.PostableClusters) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range clusterAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, clustersTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}
