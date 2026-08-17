package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

// buildJobRecords assembles the page records. Pod status counts come from
// podStatusCounts in both modes; every row is a group of pods (one job in
// list mode, an arbitrary roll-up in grouped_list mode).
func buildJobRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	podStatusCounts map[string]podStatusCounts,
) []inframonitoringtypes.JobRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.JobRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		jobName := labels[inframonitoringtypes.JobNameAttrKey]

		record := inframonitoringtypes.JobRecord{ // initialize with default values
			JobName:               jobName,
			JobCPU:                -1,
			JobCPURequest:         -1,
			JobCPULimit:           -1,
			JobMemory:             -1,
			JobMemoryRequest:      -1,
			JobMemoryLimit:        -1,
			DesiredSuccessfulPods: -1,
			ActivePods:            -1,
			FailedPods:            -1,
			SuccessfulPods:        -1,
			Meta:                  map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.JobCPU = v
			}
			if v, exists := metrics["B"]; exists {
				record.JobCPURequest = v
			}
			if v, exists := metrics["C"]; exists {
				record.JobCPULimit = v
			}
			if v, exists := metrics["D"]; exists {
				record.JobMemory = v
			}
			if v, exists := metrics["E"]; exists {
				record.JobMemoryRequest = v
			}
			if v, exists := metrics["F"]; exists {
				record.JobMemoryLimit = v
			}
			if v, exists := metrics["H"]; exists {
				record.DesiredSuccessfulPods = int(v)
			}
			if v, exists := metrics["I"]; exists {
				record.ActivePods = int(v)
			}
			if v, exists := metrics["J"]; exists {
				record.FailedPods = int(v)
			}
			if v, exists := metrics["K"]; exists {
				record.SuccessfulPods = int(v)
			}
		}

		if podStatusCountsForGroup, ok := podStatusCounts[compositeKey]; ok {
			record.PodCountsByStatus = podStatusCountsToResponse(podStatusCountsForGroup)
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

// getTopJobGroupsAndMetadata concurrently fetches metadata + the ordering-metric
// ranking (plus the full-scope pod-status keyset when filtering, to intersect both).
func (m *module) getTopJobGroupsAndMetadata(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableJobs,
) ([]map[string]string, map[string]map[string]string, map[string]podStatusCounts, *qbtypes.QueryWarnData, error) {

	var (
		orderByKey        string
		metadataMap       map[string]map[string]string
		allMetricGroups   []rankedGroup
		statusCounts      map[string]podStatusCounts
		statusWarning     *qbtypes.QueryWarnData
		filter            *qbtypes.Filter
		filterByPodStatus []inframonitoringtypes.PodStatus
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
		metadataMap, err = m.getJobsTableMetadata(gCtx, orgID, req)
		return err
	})

	if len(filterByPodStatus) != 0 {
		g.Go(func() error {
			var err error
			statusCounts, statusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, orgID, req.Start, req.End, filter, req.GroupBy, nil, filterByPodStatus)
			return err
		})
	}

	if orderByKey == inframonitoringtypes.JobNameAttrKey {
		if err := g.Wait(); err != nil {
			return nil, nil, nil, nil, err
		}
		// Secondary filter: keep only status-matching groups. A missing metric
		// yields an empty statusCounts, so this correctly empties the result
		// (the caller also surfaces the warning).
		if len(filterByPodStatus) != 0 {
			metadataMap = intersectMap(metadataMap, statusCounts)
		}
		pageGroups := inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.JobNameAttrKey)
		return pageGroups, metadataMap, statusCounts, statusWarning, nil
	}

	queryNamesForOrderBy := orderByToJobsQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newJobsTableListQuery().CompositeQuery.Queries {
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
	if len(filterByPodStatus) != 0 {
		allMetricGroups = intersectRankedGroups(allMetricGroups, statusCounts)
		metadataMap = intersectMap(metadataMap, statusCounts)
	}

	pageGroups := paginateWithBackfill(allMetricGroups, metadataMap, req.GroupBy, req.Offset, req.Limit)
	return pageGroups, metadataMap, statusCounts, statusWarning, nil
}

func (m *module) getJobsTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableJobs) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range jobAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	var filter *qbtypes.Filter
	if req.Filter != nil {
		filter = &req.Filter.Filter
	}
	return m.getMetadata(ctx, orgID, jobsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, filter, req.Start, req.End)
}
