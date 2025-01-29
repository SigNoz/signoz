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
	metricToUseForJobs = "k8s_job_desired_successful_pods"
	k8sJobNameAttrKey  = "k8s_job_name"

	metricNamesForJobs = map[string]string{
		"desired_successful_pods": "k8s_job_desired_successful_pods",
		"active_pods":             "k8s_job_active_pods",
		"failed_pods":             "k8s_job_failed_pods",
		"successful_pods":         "k8s_job_successful_pods",
	}

	jobAttrsToEnrich = []string{
		"k8s_job_name",
		"k8s_namespace_name",
		"k8s_cluster_name",
	}

	queryNamesForJobs = map[string][]string{
		"cpu":                     {"A"},
		"cpu_request":             {"B", "A"},
		"cpu_limit":               {"C", "A"},
		"memory":                  {"D"},
		"memory_request":          {"E", "D"},
		"memory_limit":            {"F", "D"},
		"restarts":                {"G", "A"},
		"desired_successful_pods": {"H"},
		"active_pods":             {"I"},
		"failed_pods":             {"J"},
		"successful_pods":         {"K"},
	}

	builderQueriesForJobs = map[string]*v3.BuilderQuery{
		// desired nodes
		"H": {
			QueryName:  "H",
			DataSource: v3.DataSourceMetrics,
			AggregateAttribute: v3.AttributeKey{
				Key:      metricNamesForJobs["desired_successful_pods"],
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
		// available nodes
		"I": {
			QueryName:  "I",
			DataSource: v3.DataSourceMetrics,
			AggregateAttribute: v3.AttributeKey{
				Key:      metricNamesForJobs["active_pods"],
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
		// failed pods
		"J": {
			QueryName:  "J",
			DataSource: v3.DataSourceMetrics,
			AggregateAttribute: v3.AttributeKey{
				Key:      metricNamesForJobs["failed_pods"],
				DataType: v3.AttributeKeyDataTypeFloat64,
			},
			Temporality: v3.Unspecified,
			Filters: &v3.FilterSet{
				Operator: "AND",
				Items:    []v3.FilterItem{},
			},
			GroupBy:          []v3.AttributeKey{},
			Expression:       "J",
			ReduceTo:         v3.ReduceToOperatorLast,
			TimeAggregation:  v3.TimeAggregationAnyLast,
			SpaceAggregation: v3.SpaceAggregationSum,
			Disabled:         false,
		},
		// successful pods
		"K": {
			QueryName:  "K",
			DataSource: v3.DataSourceMetrics,
			AggregateAttribute: v3.AttributeKey{
				Key:      metricNamesForJobs["successful_pods"],
				DataType: v3.AttributeKeyDataTypeFloat64,
			},
			Temporality: v3.Unspecified,
			Filters: &v3.FilterSet{
				Operator: "AND",
				Items:    []v3.FilterItem{},
			},
			GroupBy:          []v3.AttributeKey{},
			Expression:       "K",
			ReduceTo:         v3.ReduceToOperatorLast,
			TimeAggregation:  v3.TimeAggregationAnyLast,
			SpaceAggregation: v3.SpaceAggregationSum,
			Disabled:         false,
		},
	}

	jobQueryNames = []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"}
)

type JobsRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewJobsRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *JobsRepo {
	return &JobsRepo{reader: reader, querierV2: querierV2}
}

func (d *JobsRepo) GetJobAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	// TODO(srikanthccv): remove hardcoded metric name and support keys from any pod metric
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForJobs
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

func (d *JobsRepo) GetJobAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForJobs
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := d.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}

	return attributeValuesResponse, nil
}

func (d *JobsRepo) getMetadataAttributes(ctx context.Context, req model.JobListRequest) (map[string]map[string]string, error) {
	jobAttrs := map[string]map[string]string{}

	for _, key := range jobAttrsToEnrich {
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
			Key:      metricToUseForJobs,
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

		jobName := stringData[k8sJobNameAttrKey]
		if _, ok := jobAttrs[jobName]; !ok {
			jobAttrs[jobName] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			jobAttrs[jobName][key.Key] = stringData[key.Key]
		}
	}

	return jobAttrs, nil
}

func (d *JobsRepo) getTopJobGroups(ctx context.Context, req model.JobListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopJobs(req)

	queryNames := queryNamesForJobs[req.OrderBy.ColumnName]
	topJobGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topJobGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := d.querierV2.QueryRange(ctx, topJobGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topJobGroupsQueryRangeParams)
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

	paginatedTopJobGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topJobGroups := []map[string]string{}
	for _, series := range paginatedTopJobGroupsSeries {
		topJobGroups = append(topJobGroups, series.Labels)
	}
	allJobGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allJobGroups = append(allJobGroups, series.Labels)
	}

	return topJobGroups, allJobGroups, nil
}

func (d *JobsRepo) GetJobList(ctx context.Context, req model.JobListRequest) (model.JobListResponse, error) {
	resp := model.JobListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "desired_pods", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sJobNameAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := WorkloadTableListQuery.Clone()

	query.Start = req.Start
	query.End = req.End
	query.Step = step

	// add additional queries for jobs
	for _, jobQuery := range builderQueriesForJobs {
		query.CompositeQuery.BuilderQueries[jobQuery.QueryName] = jobQuery.Clone()
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
		// make sure we only get records for jobs
		query.Filters.Items = append(query.Filters.Items, v3.FilterItem{
			Key:      v3.AttributeKey{Key: k8sJobNameAttrKey},
			Operator: v3.FilterOperatorExists,
		})
	}

	jobAttrs, err := d.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topJobGroups, allJobGroups, err := d.getTopJobGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topJobGroup := range topJobGroups {
		for k, v := range topJobGroup {
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

	records := []model.JobListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {

			record := model.JobListRecord{
				JobName:               "",
				CPUUsage:              -1,
				CPURequest:            -1,
				CPULimit:              -1,
				MemoryUsage:           -1,
				MemoryRequest:         -1,
				MemoryLimit:           -1,
				DesiredSuccessfulPods: -1,
				ActivePods:            -1,
				FailedPods:            -1,
				SuccessfulPods:        -1,
			}

			if jobName, ok := row.Data[k8sJobNameAttrKey].(string); ok {
				record.JobName = jobName
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

			if desiredSuccessfulPods, ok := row.Data["H"].(float64); ok {
				record.DesiredSuccessfulPods = int(desiredSuccessfulPods)
			}

			if activePods, ok := row.Data["I"].(float64); ok {
				record.ActivePods = int(activePods)
			}

			if failedPods, ok := row.Data["J"].(float64); ok {
				record.FailedPods = int(failedPods)
			}

			if successfulPods, ok := row.Data["K"].(float64); ok {
				record.SuccessfulPods = int(successfulPods)
			}

			record.Meta = map[string]string{}
			if _, ok := jobAttrs[record.JobName]; ok && record.JobName != "" {
				record.Meta = jobAttrs[record.JobName]
			}

			for k, v := range row.Data {
				if slices.Contains(jobQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allJobGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)

	return resp, nil
}
