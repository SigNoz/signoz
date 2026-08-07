package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

// buildNamespaceRecords assembles the page records. Pod status counts come from
// podStatusCounts in both modes; every row is a group of pods.
func buildNamespaceRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	podStatusCounts map[string]podStatusCounts,
	resourceCounts map[string]map[string]int64,
) []inframonitoringtypes.NamespaceRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.NamespaceRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		namespaceName := labels[inframonitoringtypes.NamespaceNameAttrKey]

		record := inframonitoringtypes.NamespaceRecord{ // initialize with default values
			NamespaceName:   namespaceName,
			NamespaceCPU:    -1,
			NamespaceMemory: -1,
			Meta:            inframonitoringtypes.NewNamespaceMeta(nil),
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.NamespaceCPU = v
			}
			if v, exists := metrics["D"]; exists {
				record.NamespaceMemory = v
			}
		}

		if podStatusCountsForGroup, ok := podStatusCounts[compositeKey]; ok {
			record.PodCountsByStatus = podStatusCountsToResponse(podStatusCountsForGroup)
		}

		if counts, ok := resourceCounts[compositeKey]; ok {
			record.Counts.Deployments = counts[inframonitoringtypes.DeploymentNameAttrKey]
			record.Counts.DaemonSets = counts[inframonitoringtypes.DaemonSetNameAttrKey]
			record.Counts.Jobs = counts[inframonitoringtypes.JobNameAttrKey]
			record.Counts.StatefulSets = counts[inframonitoringtypes.StatefulSetNameAttrKey]
		}

		if attrs, ok := metadataMap[compositeKey]; ok {
			record.Meta = inframonitoringtypes.NewNamespaceMeta(attrs)
		}

		records = append(records, record)
	}
	return records
}

func (m *module) getTopNamespaceGroupsAndMetadata(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableNamespaces,
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
		metadataMap, err = m.getNamespacesTableMetadata(gCtx, orgID, req)
		return err
	})

	if orderByKey == inframonitoringtypes.NamespaceNameAttrKey {
		if err := g.Wait(); err != nil {
			return nil, nil, err
		}
		pageGroups := inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.NamespaceNameAttrKey)
		return pageGroups, metadataMap, nil
	}

	queryNamesForOrderBy := orderByToNamespacesQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newNamespacesTableListQuery().CompositeQuery.Queries {
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

func (m *module) getNamespacesTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNamespaces) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range inframonitoringtypes.NamespaceMetaKeys {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, orgID, namespacesTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}
