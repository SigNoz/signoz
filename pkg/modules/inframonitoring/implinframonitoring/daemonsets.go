package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// buildDaemonSetRecords assembles the page records. Pod phase counts come from
// phaseCounts in both modes; every row is a group of pods (one daemonset in
// list mode, an arbitrary roll-up in grouped_list mode), so there's no
// per-row "current phase" concept.
func buildDaemonSetRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	phaseCounts map[string]podPhaseCounts,
) []inframonitoringtypes.DaemonSetRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.DaemonSetRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		daemonSetName := labels[daemonSetNameAttrKey]

		record := inframonitoringtypes.DaemonSetRecord{ // initialize with default values
			DaemonSetName:          daemonSetName,
			DaemonSetCPU:           -1,
			DaemonSetCPURequest:    -1,
			DaemonSetCPULimit:      -1,
			DaemonSetMemory:        -1,
			DaemonSetMemoryRequest: -1,
			DaemonSetMemoryLimit:   -1,
			DesiredNodes:           -1,
			CurrentNodes:           -1,
			Meta:                   map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.DaemonSetCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.DaemonSetCPURequest = v
			}
			if v, exists := metrics["C"]; exists {
				record.DaemonSetCPULimit = v
			}
			if v, exists := metrics["D"]; exists {
				record.DaemonSetMemory = v
			}
			if v, exists := metrics["E"]; exists {
				record.DaemonSetMemoryRequest = v
			}
			if v, exists := metrics["F"]; exists {
				record.DaemonSetMemoryLimit = v
			}
			if v, exists := metrics["H"]; exists {
				record.DesiredNodes = int(v)
			}
			if v, exists := metrics["I"]; exists {
				record.CurrentNodes = int(v)
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

func (m *module) getTopDaemonSetGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableDaemonSets,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	queryNamesForOrderBy := orderByToDaemonSetsQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newDaemonSetsTableListQuery().CompositeQuery.Queries {
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

func (m *module) getDaemonSetsTableMetadata(ctx context.Context, req *inframonitoringtypes.PostableDaemonSets) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range daemonSetAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, daemonSetsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}
