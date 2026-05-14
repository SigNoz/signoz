package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// buildDeploymentRecords assembles the page records. Pod phase counts come from
// phaseCounts in both modes; every row is a group of pods (one deployment in
// list mode, an arbitrary roll-up in grouped_list mode), so there's no
// per-row "current phase" concept.
func buildDeploymentRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	phaseCounts map[string]podPhaseCounts,
) []inframonitoringtypes.DeploymentRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.DeploymentRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		deploymentName := labels[deploymentNameAttrKey]

		record := inframonitoringtypes.DeploymentRecord{ // initialize with default values
			DeploymentName:          deploymentName,
			DeploymentCPU:           -1,
			DeploymentCPURequest:    -1,
			DeploymentCPULimit:      -1,
			DeploymentMemory:        -1,
			DeploymentMemoryRequest: -1,
			DeploymentMemoryLimit:   -1,
			DesiredPods:             -1,
			AvailablePods:           -1,
			Meta:                    map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.DeploymentCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.DeploymentCPURequest = v
			}
			if v, exists := metrics["C"]; exists {
				record.DeploymentCPULimit = v
			}
			if v, exists := metrics["D"]; exists {
				record.DeploymentMemory = v
			}
			if v, exists := metrics["E"]; exists {
				record.DeploymentMemoryRequest = v
			}
			if v, exists := metrics["F"]; exists {
				record.DeploymentMemoryLimit = v
			}
			if v, exists := metrics["H"]; exists {
				record.DesiredPods = int(v)
			}
			if v, exists := metrics["I"]; exists {
				record.AvailablePods = int(v)
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

func (m *module) getTopDeploymentGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableDeployments,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	queryNamesForOrderBy := orderByToDeploymentsQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newDeploymentsTableListQuery().CompositeQuery.Queries {
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

func (m *module) getDeploymentsTableMetadata(ctx context.Context, req *inframonitoringtypes.PostableDeployments) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range deploymentAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, deploymentsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}
