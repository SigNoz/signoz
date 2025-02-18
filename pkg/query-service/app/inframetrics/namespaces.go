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
	metricToUseForNamespaces = "k8s_pod_cpu_utilization"

	namespaceAttrsToEnrich = []string{
		"k8s_namespace_name",
		"k8s_cluster_name",
	}

	queryNamesForNamespaces = map[string][]string{
		"cpu":       {"A"},
		"memory":    {"D"},
		"pod_phase": {"H", "I", "J", "K"},
	}
	namespaceQueryNames = []string{"A", "D", "H", "I", "J", "K"}

	attributesKeysForNamespaces = []v3.AttributeKey{
		{Key: "k8s_namespace_name"},
		{Key: "k8s_cluster_name"},
	}

	k8sNamespaceNameAttrKey = "k8s_namespace_name"
)

type NamespacesRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewNamespacesRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *NamespacesRepo {
	return &NamespacesRepo{reader: reader, querierV2: querierV2}
}

func (p *NamespacesRepo) GetNamespaceAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	return &v3.FilterAttributeKeyResponse{AttributeKeys: attributesKeysForNamespaces}, nil
}

func (p *NamespacesRepo) GetNamespaceAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForNamespaces
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := p.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	return attributeValuesResponse, nil
}

func (p *NamespacesRepo) getMetadataAttributes(ctx context.Context, req model.NamespaceListRequest) (map[string]map[string]string, error) {
	namespaceAttrs := map[string]map[string]string{}

	for _, key := range namespaceAttrsToEnrich {
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
			Key:      metricToUseForNamespaces,
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

		namespaceName := stringData[k8sNamespaceNameAttrKey]
		if _, ok := namespaceAttrs[namespaceName]; !ok {
			namespaceAttrs[namespaceName] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			namespaceAttrs[namespaceName][key.Key] = stringData[key.Key]
		}
	}

	return namespaceAttrs, nil
}

func (p *NamespacesRepo) getTopNamespaceGroups(ctx context.Context, req model.NamespaceListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopNamespaces(req)

	queryNames := queryNamesForNamespaces[req.OrderBy.ColumnName]
	topNamespaceGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topNamespaceGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, topNamespaceGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topNamespaceGroupsQueryRangeParams)
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

	paginatedTopNamespaceGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topNamespaceGroups := []map[string]string{}
	for _, series := range paginatedTopNamespaceGroupsSeries {
		topNamespaceGroups = append(topNamespaceGroups, series.Labels)
	}
	allNamespaceGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allNamespaceGroups = append(allNamespaceGroups, series.Labels)
	}

	return topNamespaceGroups, allNamespaceGroups, nil
}

func (p *NamespacesRepo) GetNamespaceList(ctx context.Context, req model.NamespaceListRequest) (model.NamespaceListResponse, error) {
	resp := model.NamespaceListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sNamespaceNameAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := PodsTableListQuery.Clone()

	query.Start = req.Start
	query.End = req.End
	query.Step = step

	for _, q := range query.CompositeQuery.BuilderQueries {

		if !slices.Contains(namespaceQueryNames, q.QueryName) {
			delete(query.CompositeQuery.BuilderQueries, q.QueryName)
		}

		q.StepInterval = step
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			if q.Filters == nil {
				q.Filters = &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}}
			}
			q.Filters.Items = append(q.Filters.Items, req.Filters.Items...)
		}
		q.GroupBy = req.GroupBy
	}

	namespaceAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topNamespaceGroups, allNamespaceGroups, err := p.getTopNamespaceGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topNamespaceGroup := range topNamespaceGroups {
		for k, v := range topNamespaceGroup {
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

	records := []model.NamespaceListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {

			record := model.NamespaceListRecord{
				CPUUsage:    -1,
				MemoryUsage: -1,
			}

			if name, ok := row.Data[k8sNamespaceNameAttrKey].(string); ok {
				record.NamespaceName = name
			}

			if cpu, ok := row.Data["A"].(float64); ok {
				record.CPUUsage = cpu
			}

			if memory, ok := row.Data["D"].(float64); ok {
				record.MemoryUsage = memory
			}

			if pending, ok := row.Data["H"].(float64); ok {
				record.CountByPhase.Pending = int(pending)
			}
			if running, ok := row.Data["I"].(float64); ok {
				record.CountByPhase.Running = int(running)
			}
			if succeeded, ok := row.Data["J"].(float64); ok {
				record.CountByPhase.Succeeded = int(succeeded)
			}
			if failed, ok := row.Data["K"].(float64); ok {
				record.CountByPhase.Failed = int(failed)
			}

			record.Meta = map[string]string{}
			if _, ok := namespaceAttrs[record.NamespaceName]; ok && record.NamespaceName != "" {
				record.Meta = namespaceAttrs[record.NamespaceName]
			}

			for k, v := range row.Data {
				if slices.Contains(namespaceQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allNamespaceGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)

	return resp, nil
}
