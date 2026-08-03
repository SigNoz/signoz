package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

// buildClusterRecords assembles the page records. Node condition counts and
// pod status counts come from the respective per-group maps in both modes;
// every row is a group of nodes+pods (analogous to namespaces).
func buildClusterRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	nodeConditionCountsMap map[string]nodeConditionCounts,
	podStatusCounts map[string]podStatusCounts,
	resourceCounts map[string]map[string]int64,
) []inframonitoringtypes.ClusterRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.ClusterRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		clusterName := labels[inframonitoringtypes.ClusterNameAttrKey]

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

		if podStatusCountsForGroup, ok := podStatusCounts[compositeKey]; ok {
			record.PodCountsByStatus = podStatusCountsToResponse(podStatusCountsForGroup)
		}

		if counts, ok := resourceCounts[compositeKey]; ok {
			record.Counts.Nodes = counts[inframonitoringtypes.NodeNameAttrKey]
			record.Counts.Namespaces = counts[inframonitoringtypes.NamespaceNameAttrKey]
			record.Counts.Deployments = counts[inframonitoringtypes.DeploymentNameAttrKey]
			record.Counts.DaemonSets = counts[inframonitoringtypes.DaemonSetNameAttrKey]
			record.Counts.Jobs = counts[inframonitoringtypes.JobNameAttrKey]
			record.Counts.StatefulSets = counts[inframonitoringtypes.StatefulSetNameAttrKey]
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

// getTopClusterGroupsAndMetadata concurrently fetches metadata + the ordering-metric
// ranking (plus the full-scope pod-status keyset when filtering, to intersect both).
func (m *module) getTopClusterGroupsAndMetadata(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableClusters,
) ([]map[string]string, map[string]map[string]string, map[string]podStatusCounts, *qbtypes.QueryWarnData, error) {

	var (
		orderByKey        string
		metadataMap       map[string]map[string]string
		allMetricGroups   []rankedGroup
		statusCounts      map[string]podStatusCounts
		statusWarning     *qbtypes.QueryWarnData
		filter            *qbtypes.Filter
		filterByPodStatus inframonitoringtypes.PodStatus
	)

	orderByKey = req.OrderBy.Key.Name

	// When filtering by pod status, resolve the full-scope status keyset
	// concurrently (pageGroups=nil spans all groups under the user filter) so it
	// can intersect metadata + ranked groups below.
	if req.Filter != nil {
		filter = &req.Filter.Filter
		filterByPodStatus = req.Filter.FilterByPodStatus
	}

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		metadataMap, err = m.getClustersTableMetadata(gCtx, orgID, req)
		return err
	})

	if !filterByPodStatus.IsZero() {
		g.Go(func() error {
			var err error
			statusCounts, statusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, orgID, req.Start, req.End, filter, req.GroupBy, nil, filterByPodStatus)
			return err
		})
	}

	if orderByKey == inframonitoringtypes.ClusterNameAttrKey {
		if err := g.Wait(); err != nil {
			return nil, nil, nil, nil, err
		}
		// Secondary filter: keep only status-matching groups. A missing metric
		// yields an empty statusCounts, so this correctly empties the result
		// (the caller also surfaces the warning).
		if !filterByPodStatus.IsZero() {
			metadataMap = intersectMap(metadataMap, statusCounts)
		}
		pageGroups := inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.ClusterNameAttrKey)
		return pageGroups, metadataMap, statusCounts, statusWarning, nil
	}

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

	g.Go(func() error {
		resp, err := m.querier.QueryRange(gCtx, orgID, topReq)
		if err != nil {
			return err
		}
		allMetricGroups = parseAndSortGroups(resp, rankingQueryName, req.GroupBy, req.OrderBy.Direction)
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, nil, nil, nil, err
	}

	// Secondary filter: intersect ranked groups + metadata with the status keyset.
	// A missing metric yields an empty statusCounts, correctly emptying the result
	// (the caller also surfaces the warning).
	if !filterByPodStatus.IsZero() {
		allMetricGroups = intersectRankedGroups(allMetricGroups, statusCounts)
		metadataMap = intersectMap(metadataMap, statusCounts)
	}

	pageGroups := paginateWithBackfill(allMetricGroups, metadataMap, req.GroupBy, req.Offset, req.Limit)
	return pageGroups, metadataMap, statusCounts, statusWarning, nil
}

func (m *module) getClustersTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableClusters) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range clusterAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	var filter *qbtypes.Filter
	if req.Filter != nil {
		filter = &req.Filter.Filter
	}
	return m.getMetadata(ctx, orgID, clustersTableMetricNamesList, req.GroupBy, nonGroupByAttrs, filter, req.Start, req.End)
}
