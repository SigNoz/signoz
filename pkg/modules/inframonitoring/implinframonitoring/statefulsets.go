package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

// buildStatefulSetRecords assembles the page records. Pod status counts come from
// podStatusCounts in both modes; every row is a group of pods (one statefulset in
// list mode, an arbitrary roll-up in grouped_list mode).
func buildStatefulSetRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	podStatusCounts map[string]podStatusCounts,
) []inframonitoringtypes.StatefulSetRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.StatefulSetRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		statefulSetName := labels[inframonitoringtypes.StatefulSetNameAttrKey]

		record := inframonitoringtypes.StatefulSetRecord{ // initialize with default values
			StatefulSetName:          statefulSetName,
			StatefulSetCPU:           -1,
			StatefulSetCPURequest:    -1,
			StatefulSetCPULimit:      -1,
			StatefulSetMemory:        -1,
			StatefulSetMemoryRequest: -1,
			StatefulSetMemoryLimit:   -1,
			DesiredPods:              -1,
			CurrentPods:              -1,
			Meta:                     inframonitoringtypes.NewStatefulSetMeta(nil),
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.StatefulSetCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.StatefulSetCPURequest = v
			}
			if v, exists := metrics["C"]; exists {
				record.StatefulSetCPULimit = v
			}
			if v, exists := metrics["D"]; exists {
				record.StatefulSetMemory = v
			}
			if v, exists := metrics["E"]; exists {
				record.StatefulSetMemoryRequest = v
			}
			if v, exists := metrics["F"]; exists {
				record.StatefulSetMemoryLimit = v
			}
			if v, exists := metrics["H"]; exists {
				record.DesiredPods = int(v)
			}
			if v, exists := metrics["I"]; exists {
				record.CurrentPods = int(v)
			}
		}

		if podStatusCountsForGroup, ok := podStatusCounts[compositeKey]; ok {
			record.PodCountsByStatus = podStatusCountsToResponse(podStatusCountsForGroup)
		}

		if attrs, ok := metadataMap[compositeKey]; ok {
			record.Meta = inframonitoringtypes.NewStatefulSetMeta(attrs)
		}

		records = append(records, record)
	}
	return records
}

func (m *module) getTopStatefulSetGroupsAndMetadata(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableStatefulSets,
) ([]map[string]string, map[string]map[string]string, error) {

	var (
		orderByKey      string
		metadataMap     map[string]map[string]string
		allMetricGroups []rankedGroup
	)

	orderByKey = req.OrderBy.Key.Name

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		metadataMap, err = m.getStatefulSetsTableMetadata(gCtx, orgID, req)
		return err
	})

	if orderByKey == inframonitoringtypes.StatefulSetNameAttrKey {
		if err := g.Wait(); err != nil {
			return nil, nil, err
		}
		pageGroups := inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.StatefulSetNameAttrKey)
		return pageGroups, metadataMap, nil
	}

	queryNamesForOrderBy := orderByToStatefulSetsQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newStatefulSetsTableListQuery().CompositeQuery.Queries {
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

	g.Go(func() error {
		resp, err := m.querier.QueryRange(gCtx, orgID, topReq)
		if err != nil {
			return err
		}
		allMetricGroups = parseAndSortGroups(resp, rankingQueryName, req.GroupBy, req.OrderBy.Direction)
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, nil, err
	}

	return paginateWithBackfill(allMetricGroups, metadataMap, req.GroupBy, req.Offset, req.Limit), metadataMap, nil
}

func (m *module) getStatefulSetsTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableStatefulSets) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range inframonitoringtypes.StatefulSetMetaKeys {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, orgID, statefulSetsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}
