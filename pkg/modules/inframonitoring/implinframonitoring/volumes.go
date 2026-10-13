package implinframonitoring

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

// buildVolumeRecords assembles the page records. VolumeUsage is taken from the
// formula query F1 = B - A (matches v1 record.VolumeUsage = capacity - available).
// No per-row sub-counts (unlike pods/nodes/clusters).
func buildVolumeRecords(
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
) []inframonitoringtypes.VolumeRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.VolumeRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		pvcName := labels[inframonitoringtypes.PersistentVolumeClaimNameAttrKey]

		record := inframonitoringtypes.VolumeRecord{ // initialize with default values
			PersistentVolumeClaimName: pvcName,
			VolumeAvailable:           -1,
			VolumeCapacity:            -1,
			VolumeUsage:               -1,
			VolumeInodes:              -1,
			VolumeInodesFree:          -1,
			VolumeInodesUsed:          -1,
			Meta:                      map[string]string{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["A"]; exists {
				record.VolumeAvailable = v
			}
			if v, exists := metrics["B"]; exists {
				record.VolumeCapacity = v
			}
			if v, exists := metrics["F1"]; exists {
				record.VolumeUsage = v
			}
			if v, exists := metrics["C"]; exists {
				record.VolumeInodes = v
			}
			if v, exists := metrics["D"]; exists {
				record.VolumeInodesFree = v
			}
			if v, exists := metrics["E"]; exists {
				record.VolumeInodesUsed = v
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

func (m *module) getTopVolumeGroupsAndMetadata(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.PostableVolumes,
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
		metadataMap, err = m.getVolumesTableMetadata(gCtx, orgID, req)
		return err
	})

	if orderByKey == inframonitoringtypes.PersistentVolumeClaimNameAttrKey {
		if err := g.Wait(); err != nil {
			return nil, nil, err
		}
		pageGroups := inframonitoringtypes.PaginateMetadataByName(metadataMap, req.GroupBy, req.OrderBy.Direction, req.Offset, req.Limit, inframonitoringtypes.PersistentVolumeClaimNameAttrKey)
		return pageGroups, metadataMap, nil
	}

	queryNamesForOrderBy := orderByToVolumesQueryNames[orderByKey]
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newVolumesTableListQuery().CompositeQuery.Queries {
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

func (m *module) getVolumesTableMetadata(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableVolumes) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range volumeAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	return m.getMetadata(ctx, orgID, volumesTableMetricNamesList, req.GroupBy, nonGroupByAttrs, req.Filter, req.Start, req.End)
}
