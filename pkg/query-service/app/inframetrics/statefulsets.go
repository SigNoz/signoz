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
	metricToUseForStatefulSets = "k8s_pod_cpu_utilization"
	k8sStatefulSetNameAttrKey  = "k8s_statefulset_name"

	metricNamesForStatefulSets = map[string]string{
		"desired_pods":   "k8s_statefulset_desired_pods",
		"available_pods": "k8s_statefulset_current_pods",
	}

	statefulSetAttrsToEnrich = []string{
		"k8s_statefulset_name",
		"k8s_namespace_name",
		"k8s_cluster_name",
	}

	queryNamesForStatefulSets = map[string][]string{
		"cpu":            {"A"},
		"cpu_request":    {"B", "A"},
		"cpu_limit":      {"C", "A"},
		"memory":         {"D"},
		"memory_request": {"E", "D"},
		"memory_limit":   {"F", "D"},
		"restarts":       {"G", "A"},
		"desired_pods":   {"H"},
		"available_pods": {"I"},
	}

	builderQueriesForStatefulSets = map[string]*v3.BuilderQuery{
		// desired pods
		"H": {
			QueryName:  "H",
			DataSource: v3.DataSourceMetrics,
			AggregateAttribute: v3.AttributeKey{
				Key:      metricNamesForStatefulSets["desired_pods"],
				DataType: v3.AttributeKeyDataTypeFloat64,
			},
			Temporality: v3.Unspecified,
			Filters: &v3.FilterSet{
				Operator: "AND",
				Items:    []v3.FilterItem{},
			},
			GroupBy:          []v3.AttributeKey{},
			Expression:       "H",
			ReduceTo:         v3.ReduceToOperatorLast,
			TimeAggregation:  v3.TimeAggregationAnyLast,
			SpaceAggregation: v3.SpaceAggregationSum,
			Disabled:         false,
		},
		// available pods
		"I": {
			QueryName:  "I",
			DataSource: v3.DataSourceMetrics,
			AggregateAttribute: v3.AttributeKey{
				Key:      metricNamesForStatefulSets["available_pods"],
				DataType: v3.AttributeKeyDataTypeFloat64,
			},
			Temporality: v3.Unspecified,
			Filters: &v3.FilterSet{
				Operator: "AND",
				Items:    []v3.FilterItem{},
			},
			GroupBy:          []v3.AttributeKey{},
			Expression:       "I",
			ReduceTo:         v3.ReduceToOperatorLast,
			TimeAggregation:  v3.TimeAggregationAnyLast,
			SpaceAggregation: v3.SpaceAggregationSum,
			Disabled:         false,
		},
	}

	statefulSetQueryNames = []string{"A", "B", "C", "D", "E", "F", "G", "H", "I"}
)

type StatefulSetsRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewStatefulSetsRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *StatefulSetsRepo {
	return &StatefulSetsRepo{reader: reader, querierV2: querierV2}
}

func (d *StatefulSetsRepo) GetStatefulSetAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	// TODO(srikanthccv): remove hardcoded metric name and support keys from any pod metric
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForStatefulSets
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeKeysResponse, err := d.reader.GetMetricAttributeKeys(ctx, &req)
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

func (d *StatefulSetsRepo) GetStatefulSetAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForStatefulSets
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := d.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}

	return attributeValuesResponse, nil
}

func (d *StatefulSetsRepo) getMetadataAttributes(ctx context.Context, req model.StatefulSetListRequest) (map[string]map[string]string, error) {
	statefulSetAttrs := map[string]map[string]string{}

	for _, key := range statefulSetAttrsToEnrich {
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
			Key:      metricToUseForStatefulSets,
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

	attrsListResponse, err := d.reader.GetListResultV3(ctx, query)
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

		statefulSetName := stringData[k8sStatefulSetNameAttrKey]
		if _, ok := statefulSetAttrs[statefulSetName]; !ok {
			statefulSetAttrs[statefulSetName] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			statefulSetAttrs[statefulSetName][key.Key] = stringData[key.Key]
		}
	}

	return statefulSetAttrs, nil
}

func (d *StatefulSetsRepo) getTopStatefulSetGroups(ctx context.Context, req model.StatefulSetListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopStatefulSets(req)

	queryNames := queryNamesForStatefulSets[req.OrderBy.ColumnName]
	topStatefulSetGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topStatefulSetGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := d.querierV2.QueryRange(ctx, topStatefulSetGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topStatefulSetGroupsQueryRangeParams)
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

	paginatedTopStatefulSetGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topStatefulSetGroups := []map[string]string{}
	for _, series := range paginatedTopStatefulSetGroupsSeries {
		topStatefulSetGroups = append(topStatefulSetGroups, series.Labels)
	}
	allStatefulSetGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allStatefulSetGroups = append(allStatefulSetGroups, series.Labels)
	}

	return topStatefulSetGroups, allStatefulSetGroups, nil
}

func (d *StatefulSetsRepo) GetStatefulSetList(ctx context.Context, req model.StatefulSetListRequest) (model.StatefulSetListResponse, error) {
	resp := model.StatefulSetListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sStatefulSetNameAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := WorkloadTableListQuery.Clone()

	query.Start = req.Start
	query.End = req.End
	query.Step = step

	// add additional queries for stateful sets
	for _, statefulSetQuery := range builderQueriesForStatefulSets {
		query.CompositeQuery.BuilderQueries[statefulSetQuery.QueryName] = statefulSetQuery.Clone()
	}

	for _, query := range query.CompositeQuery.BuilderQueries {
		query.StepInterval = step
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			if query.Filters == nil {
				query.Filters = &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}}
			}
			query.Filters.Items = append(query.Filters.Items, req.Filters.Items...)
		}
		query.GroupBy = req.GroupBy
		// make sure we only get records for daemon sets
		query.Filters.Items = append(query.Filters.Items, v3.FilterItem{
			Key:      v3.AttributeKey{Key: k8sStatefulSetNameAttrKey},
			Operator: v3.FilterOperatorExists,
		})
	}

	statefulSetAttrs, err := d.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topStatefulSetGroups, allStatefulSetGroups, err := d.getTopStatefulSetGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topStatefulSetGroup := range topStatefulSetGroups {
		for k, v := range topStatefulSetGroup {
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

	queryResponse, _, err := d.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	formattedResponse, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	records := []model.StatefulSetListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {

			record := model.StatefulSetListRecord{
				StatefulSetName: "",
				CPUUsage:        -1,
				CPURequest:      -1,
				CPULimit:        -1,
				MemoryUsage:     -1,
				MemoryRequest:   -1,
				MemoryLimit:     -1,
				DesiredPods:     -1,
				AvailablePods:   -1,
			}

			if statefulSetName, ok := row.Data[k8sStatefulSetNameAttrKey].(string); ok {
				record.StatefulSetName = statefulSetName
			}

			if cpu, ok := row.Data["A"].(float64); ok {
				record.CPUUsage = cpu
			}
			if cpuRequest, ok := row.Data["B"].(float64); ok {
				record.CPURequest = cpuRequest
			}

			if cpuLimit, ok := row.Data["C"].(float64); ok {
				record.CPULimit = cpuLimit
			}

			if memory, ok := row.Data["D"].(float64); ok {
				record.MemoryUsage = memory
			}

			if memoryRequest, ok := row.Data["E"].(float64); ok {
				record.MemoryRequest = memoryRequest
			}

			if memoryLimit, ok := row.Data["F"].(float64); ok {
				record.MemoryLimit = memoryLimit
			}

			if restarts, ok := row.Data["G"].(float64); ok {
				record.Restarts = int(restarts)
			}

			if desiredPods, ok := row.Data["H"].(float64); ok {
				record.DesiredPods = int(desiredPods)
			}

			if availablePods, ok := row.Data["I"].(float64); ok {
				record.AvailablePods = int(availablePods)
			}

			record.Meta = map[string]string{}
			if _, ok := statefulSetAttrs[record.StatefulSetName]; ok && record.StatefulSetName != "" {
				record.Meta = statefulSetAttrs[record.StatefulSetName]
			}

			for k, v := range row.Data {
				if slices.Contains(statefulSetQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allStatefulSetGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)

	return resp, nil
}
