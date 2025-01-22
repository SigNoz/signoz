package inframetrics

import (
	"context"
	"math"
	"sort"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/slices"
)

var (
	metricToUseForVolumes = "k8s_volume_available"

	volumeAttrsToEnrich = []string{
		"k8s_pod_uid",
		"k8s_pod_name",
		"k8s_namespace_name",
		"k8s_node_name",
		"k8s_statefulset_name",
		"k8s_cluster_name",
		"k8s_persistentvolumeclaim_name",
	}

	k8sPersistentVolumeClaimNameAttrKey = "k8s_persistentvolumeclaim_name"

	queryNamesForVolumes = map[string][]string{
		"available":   {"A"},
		"capacity":    {"B", "A"},
		"usage":       {"F1", "B", "A"},
		"inodes":      {"C", "A"},
		"inodes_free": {"D", "A"},
		"inodes_used": {"E", "A"},
	}

	volumeQueryNames = []string{"A", "B", "C", "D", "E", "F1"}

	metricNamesForVolumes = map[string]string{
		"available":   "k8s_volume_available",
		"capacity":    "k8s_volume_capacity",
		"inodes":      "k8s_volume_inodes",
		"inodes_free": "k8s_volume_inodes_free",
		"inodes_used": "k8s_volume_inodes_used",
	}
)

type PvcsRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewPvcsRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *PvcsRepo {
	return &PvcsRepo{reader: reader, querierV2: querierV2}
}

func (p *PvcsRepo) GetPvcAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForVolumes
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeKeysResponse, err := p.reader.GetMetricAttributeKeys(ctx, &req)
	if err != nil {
		return nil, err
	}

	// TODO(srikanthccv): only return resource attributes when we have a way to
	// distinguish between resource attributes and other attributes.
	filteredKeys := []v3.AttributeKey{}
	for _, key := range attributeKeysResponse.AttributeKeys {
		if slices.Contains(pointAttrsToIgnore, key.Key) {
			continue
		}
		filteredKeys = append(filteredKeys, key)
	}

	return &v3.FilterAttributeKeyResponse{AttributeKeys: filteredKeys}, nil
}

func (p *PvcsRepo) GetPvcAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForVolumes
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := p.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	return attributeValuesResponse, nil
}

func (p *PvcsRepo) getMetadataAttributes(ctx context.Context, req model.VolumeListRequest) (map[string]map[string]string, error) {
	volumeAttrs := map[string]map[string]string{}

	for _, key := range volumeAttrsToEnrich {
		hasKey := false
		for _, groupByKey := range req.GroupBy {
			if groupByKey.Key == key {
				hasKey = true
				break
			}
		}
		if !hasKey {
			req.GroupBy = append(req.GroupBy, v3.AttributeKey{Key: key})
		}
	}

	mq := v3.BuilderQuery{
		DataSource: v3.DataSourceMetrics,
		AggregateAttribute: v3.AttributeKey{
			Key:      metricToUseForVolumes,
			DataType: v3.AttributeKeyDataTypeFloat64,
		},
		Temporality: v3.Unspecified,
		GroupBy:     req.GroupBy,
	}

	query, err := helpers.PrepareTimeseriesFilterQuery(req.Start, req.End, &mq)
	if err != nil {
		return nil, err
	}

	query = localQueryToDistributedQuery(query)

	attrsListResponse, err := p.reader.GetListResultV3(ctx, query)
	if err != nil {
		return nil, err
	}

	for _, row := range attrsListResponse {
		stringData := map[string]string{}
		for key, value := range row.Data {
			if str, ok := value.(string); ok {
				stringData[key] = str
			} else if strPtr, ok := value.(*string); ok {
				stringData[key] = *strPtr
			}
		}

		volumeName := stringData[k8sPersistentVolumeClaimNameAttrKey]
		if _, ok := volumeAttrs[volumeName]; !ok {
			volumeAttrs[volumeName] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			volumeAttrs[volumeName][key.Key] = stringData[key.Key]
		}
	}

	return volumeAttrs, nil
}

func (p *PvcsRepo) getTopVolumeGroups(ctx context.Context, req model.VolumeListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopVolumes(req)

	queryNames := queryNamesForVolumes[req.OrderBy.ColumnName]
	topVolumeGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
		Start: req.Start,
		End:   req.End,
		Step:  step,
		CompositeQuery: &v3.CompositeQuery{
			BuilderQueries: map[string]*v3.BuilderQuery{},
			QueryType:      v3.QueryTypeBuilder,
			PanelType:      v3.PanelTypeTable,
		},
	}

	for _, queryName := range queryNames {
		query := q.CompositeQuery.BuilderQueries[queryName].Clone()
		query.StepInterval = step
		query.MetricTableHints = &v3.MetricTableHints{
			TimeSeriesTableName: timeSeriesTableName,
			SamplesTableName:    samplesTableName,
		}
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			if query.Filters == nil {
				query.Filters = &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}}
			}
			query.Filters.Items = append(query.Filters.Items, req.Filters.Items...)
		}
		topVolumeGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, topVolumeGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topVolumeGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}

	if len(formattedResponse) == 0 || len(formattedResponse[0].Series) == 0 {
		return nil, nil, nil
	}

	if req.OrderBy.Order == v3.DirectionDesc {
		sort.Slice(formattedResponse[0].Series, func(i, j int) bool {
			return formattedResponse[0].Series[i].Points[0].Value > formattedResponse[0].Series[j].Points[0].Value
		})
	} else {
		sort.Slice(formattedResponse[0].Series, func(i, j int) bool {
			return formattedResponse[0].Series[i].Points[0].Value < formattedResponse[0].Series[j].Points[0].Value
		})
	}

	limit := math.Min(float64(req.Offset+req.Limit), float64(len(formattedResponse[0].Series)))

	paginatedTopVolumeGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topVolumeGroups := []map[string]string{}
	for _, series := range paginatedTopVolumeGroupsSeries {
		topVolumeGroups = append(topVolumeGroups, series.Labels)
	}
	allVolumeGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allVolumeGroups = append(allVolumeGroups, series.Labels)
	}

	return topVolumeGroups, allVolumeGroups, nil
}

func (p *PvcsRepo) GetPvcList(ctx context.Context, req model.VolumeListRequest) (model.VolumeListResponse, error) {
	resp := model.VolumeListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "usage", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sPersistentVolumeClaimNameAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := PvcsTableListQuery.Clone()

	query.Start = req.Start
	query.End = req.End
	query.Step = step

	for _, query := range query.CompositeQuery.BuilderQueries {
		query.StepInterval = step
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			if query.Filters == nil {
				query.Filters = &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}}
			}
			query.Filters.Items = append(query.Filters.Items, req.Filters.Items...)
		}
		query.GroupBy = req.GroupBy
	}

	volumeAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topVolumeGroups, allVolumeGroups, err := p.getTopVolumeGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topVolumeGroup := range topVolumeGroups {
		for k, v := range topVolumeGroup {
			groupFilters[k] = append(groupFilters[k], v)
		}
	}

	for groupKey, groupValues := range groupFilters {
		hasGroupFilter := false
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			for _, filter := range req.Filters.Items {
				if filter.Key.Key == groupKey {
					hasGroupFilter = true
					break
				}
			}
		}

		if !hasGroupFilter {
			for _, query := range query.CompositeQuery.BuilderQueries {
				query.Filters.Items = append(query.Filters.Items, v3.FilterItem{
					Key:      v3.AttributeKey{Key: groupKey},
					Value:    groupValues,
					Operator: v3.FilterOperatorIn,
				})
			}
		}
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	formattedResponse, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	records := []model.VolumeListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {

			record := model.VolumeListRecord{
				VolumeUsage:      -1,
				VolumeAvailable:  -1,
				VolumeCapacity:   -1,
				VolumeInodes:     -1,
				VolumeInodesFree: -1,
				VolumeInodesUsed: -1,
				Meta:             map[string]string{},
			}

			if volumeName, ok := row.Data[k8sPersistentVolumeClaimNameAttrKey].(string); ok {
				record.PersistentVolumeClaimName = volumeName
			}

			if volumeAvailable, ok := row.Data["A"].(float64); ok {
				record.VolumeAvailable = volumeAvailable
			}
			if volumeCapacity, ok := row.Data["B"].(float64); ok {
				record.VolumeCapacity = volumeCapacity
			}

			if volumeInodes, ok := row.Data["C"].(float64); ok {
				record.VolumeInodes = volumeInodes
			}

			if volumeInodesFree, ok := row.Data["D"].(float64); ok {
				record.VolumeInodesFree = volumeInodesFree
			}

			if volumeInodesUsed, ok := row.Data["E"].(float64); ok {
				record.VolumeInodesUsed = volumeInodesUsed
			}

			record.VolumeUsage = record.VolumeCapacity - record.VolumeAvailable

			record.Meta = map[string]string{}
			if _, ok := volumeAttrs[record.PersistentVolumeClaimName]; ok && record.PersistentVolumeClaimName != "" {
				record.Meta = volumeAttrs[record.PersistentVolumeClaimName]
			}

			for k, v := range row.Data {
				if slices.Contains(volumeQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allVolumeGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)

	return resp, nil
}
