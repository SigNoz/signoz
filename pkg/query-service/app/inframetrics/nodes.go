package inframetrics

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/slices"
)

var (
	metricToUseForNodes = "k8s_node_cpu_utilization"

	nodeAttrsToEnrich = []string{"k8s_node_name", "k8s_node_uid", "k8s_cluster_name"}

	k8sNodeGroupAttrKey = "k8s_node_name"

	queryNamesForNodes = map[string][]string{
		"cpu":                {"A"},
		"cpu_allocatable":    {"B"},
		"memory":             {"C"},
		"memory_allocatable": {"D"},
	}
	nodeQueryNames = []string{"A", "B", "C", "D", "E", "F"}

	metricNamesForNodes = map[string]string{
		"cpu":                "k8s_node_cpu_utilization",
		"cpu_allocatable":    "k8s_node_allocatable_cpu",
		"memory":             "k8s_node_memory_usage",
		"memory_allocatable": "k8s_node_allocatable_memory",
		"node_condition":     "k8s_node_condition_ready",
	}
)

type NodesRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewNodesRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *NodesRepo {
	return &NodesRepo{reader: reader, querierV2: querierV2}
}

func (n *NodesRepo) GetNodeAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForNodes
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeKeysResponse, err := n.reader.GetMetricAttributeKeys(ctx, &req)
	if err != nil {
		return nil, err
	}

	return attributeKeysResponse, nil
}

func (n *NodesRepo) DidSendNodeMetrics(ctx context.Context) (bool, error) {
	namesStr := "'" + strings.Join(nodeMetricNamesToCheck, "','") + "'"

	query := fmt.Sprintf(didSendNodeMetricsQuery,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME, namesStr)

	count, err := n.reader.GetCountOfThings(ctx, query)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (n *NodesRepo) GetNodeAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForNodes
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := n.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}

	return attributeValuesResponse, nil
}

func (p *NodesRepo) getMetadataAttributes(ctx context.Context, req model.NodeListRequest) (map[string]map[string]string, error) {
	nodeAttrs := map[string]map[string]string{}

	for _, key := range nodeAttrsToEnrich {
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
			Key:      metricToUseForNodes,
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

		nodeUID := stringData[k8sNodeGroupAttrKey]
		if _, ok := nodeAttrs[nodeUID]; !ok {
			nodeAttrs[nodeUID] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			nodeAttrs[nodeUID][key.Key] = stringData[key.Key]
		}
	}

	return nodeAttrs, nil
}

func (p *NodesRepo) getTopNodeGroups(ctx context.Context, req model.NodeListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopNodes(req)

	queryNames := queryNamesForNodes[req.OrderBy.ColumnName]
	topNodeGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topNodeGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, topNodeGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topNodeGroupsQueryRangeParams)
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

	paginatedTopNodeGroupsSeries := formattedResponse[0].Series[req.Offset:int(max)]

	topNodeGroups := []map[string]string{}
	for _, series := range paginatedTopNodeGroupsSeries {
		topNodeGroups = append(topNodeGroups, series.Labels)
	}
	allNodeGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allNodeGroups = append(allNodeGroups, series.Labels)
	}

	return topNodeGroups, allNodeGroups, nil
}

func (p *NodesRepo) GetNodeList(ctx context.Context, req model.NodeListRequest) (model.NodeListResponse, error) {
	resp := model.NodeListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sNodeGroupAttrKey}}
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

	nodeAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topNodeGroups, allNodeGroups, err := p.getTopNodeGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topNodeGroup := range topNodeGroups {
		for k, v := range topNodeGroup {
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

	records := []model.NodeListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {

			record := model.NodeListRecord{
				NodeCPUUsage:          -1,
				NodeCPUAllocatable:    -1,
				NodeMemoryUsage:       -1,
				NodeMemoryAllocatable: -1,
			}

			if nodeUID, ok := row.Data[k8sNodeGroupAttrKey].(string); ok {
				record.NodeUID = nodeUID
			}

			if cpu, ok := row.Data["A"].(float64); ok {
				record.NodeCPUUsage = cpu
			}

			if cpuAllocatable, ok := row.Data["B"].(float64); ok {
				record.NodeCPUAllocatable = cpuAllocatable
			}

			if mem, ok := row.Data["C"].(float64); ok {
				record.NodeMemoryUsage = mem
			}

			if memory, ok := row.Data["D"].(float64); ok {
				record.NodeMemoryAllocatable = memory
			}

			if ready, ok := row.Data["E"].(float64); ok {
				record.CountByCondition.Ready = int(ready)
			}

			if notReady, ok := row.Data["F"].(float64); ok {
				record.CountByCondition.NotReady = int(notReady)
			}

			record.Meta = map[string]string{}
			if _, ok := nodeAttrs[record.NodeUID]; ok && record.NodeUID != "" {
				record.Meta = nodeAttrs[record.NodeUID]
			}

			for k, v := range row.Data {
				if slices.Contains(nodeQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allNodeGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)
	return resp, nil
}
