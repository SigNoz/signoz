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
	metricToUseForClusters = "k8s_node_cpu_utilization"

	clusterAttrsToEnrich = []string{"k8s_cluster_name"}

	// TODO(srikanthccv): change this to k8s_cluster_uid after showing the missing data banner
	k8sClusterUIDAttrKey = "k8s_cluster_name"

	queryNamesForClusters = map[string][]string{
		"cpu":                {"A"},
		"cpu_allocatable":    {"B"},
		"memory":             {"C"},
		"memory_allocatable": {"D"},
	}
	clusterQueryNames = []string{"A", "B", "C", "D"}
)

type ClustersRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewClustersRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *ClustersRepo {
	return &ClustersRepo{reader: reader, querierV2: querierV2}
}

func (n *ClustersRepo) GetClusterAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForClusters
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeKeysResponse, err := n.reader.GetMetricAttributeKeys(ctx, &req)
	if err != nil {
		return nil, err
	}

	return attributeKeysResponse, nil
}

func (n *ClustersRepo) GetClusterAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForClusters
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := n.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}

	return attributeValuesResponse, nil
}

func (p *ClustersRepo) getMetadataAttributes(ctx context.Context, req model.ClusterListRequest) (map[string]map[string]string, error) {
	clusterAttrs := map[string]map[string]string{}

	for _, key := range clusterAttrsToEnrich {
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
			Key:      metricToUseForClusters,
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

		clusterUID := stringData[k8sClusterUIDAttrKey]
		if _, ok := clusterAttrs[clusterUID]; !ok {
			clusterAttrs[clusterUID] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			clusterAttrs[clusterUID][key.Key] = stringData[key.Key]
		}
	}

	return clusterAttrs, nil
}

func (p *ClustersRepo) getTopClusterGroups(ctx context.Context, req model.ClusterListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopClusters(req)

	queryNames := queryNamesForClusters[req.OrderBy.ColumnName]
	topClusterGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topClusterGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, topClusterGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topClusterGroupsQueryRangeParams)
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

	max := math.Min(float64(req.Offset+req.Limit), float64(len(formattedResponse[0].Series)))

	paginatedTopClusterGroupsSeries := formattedResponse[0].Series[req.Offset:int(max)]

	topClusterGroups := []map[string]string{}
	for _, series := range paginatedTopClusterGroupsSeries {
		topClusterGroups = append(topClusterGroups, series.Labels)
	}
	allClusterGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allClusterGroups = append(allClusterGroups, series.Labels)
	}

	return topClusterGroups, allClusterGroups, nil
}

func (p *ClustersRepo) GetClusterList(ctx context.Context, req model.ClusterListRequest) (model.ClusterListResponse, error) {
	resp := model.ClusterListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sClusterUIDAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := NodesTableListQuery.Clone()

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

	clusterAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topClusterGroups, allClusterGroups, err := p.getTopClusterGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topClusterGroup := range topClusterGroups {
		for k, v := range topClusterGroup {
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

	records := []model.ClusterListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {

			record := model.ClusterListRecord{
				CPUUsage:          -1,
				CPUAllocatable:    -1,
				MemoryUsage:       -1,
				MemoryAllocatable: -1,
			}

			if clusterUID, ok := row.Data[k8sClusterUIDAttrKey].(string); ok {
				record.ClusterUID = clusterUID
			}

			if cpu, ok := row.Data["A"].(float64); ok {
				record.CPUUsage = cpu
			}

			if cpuAllocatable, ok := row.Data["B"].(float64); ok {
				record.CPUAllocatable = cpuAllocatable
			}

			if mem, ok := row.Data["C"].(float64); ok {
				record.MemoryUsage = mem
			}

			if memoryAllocatable, ok := row.Data["D"].(float64); ok {
				record.MemoryAllocatable = memoryAllocatable
			}

			record.Meta = map[string]string{}
			if _, ok := clusterAttrs[record.ClusterUID]; ok && record.ClusterUID != "" {
				record.Meta = clusterAttrs[record.ClusterUID]
			}

			for k, v := range row.Data {
				if slices.Contains(clusterQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allClusterGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)

	return resp, nil
}
