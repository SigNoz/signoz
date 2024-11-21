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
	queryNamesForTopProcesses = map[string][]string{
		"cpu":    {"A"},
		"memory": {"C"},
	}

	processPIDAttrKey       = "process_pid"
	metricNamesForProcesses = map[string]string{
		"cpu":    "process_cpu_time",
		"memory": "process_memory_usage",
	}
	metricToUseForProcessAttributes = "process_memory_usage"
	processNameAttrKey              = "process_executable_name"
	processCMDAttrKey               = "process_command"
	processCMDLineAttrKey           = "process_command_line"
)

type ProcessesRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewProcessesRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *ProcessesRepo {
	return &ProcessesRepo{reader: reader, querierV2: querierV2}
}

func (p *ProcessesRepo) GetProcessAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	// TODO(srikanthccv): remove hardcoded metric name and support keys from any system metric
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = "process_memory_usage"
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

func (p *ProcessesRepo) GetProcessAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = "process_memory_usage"
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := p.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	return attributeValuesResponse, nil
}

func (p *ProcessesRepo) getMetadataAttributes(ctx context.Context,
	req model.ProcessListRequest) (map[string]map[string]string, error) {
	processAttrs := map[string]map[string]string{}

	keysToAdd := []string{"process_pid", "process_executable_name", "process_command", "process_command_line"}
	for _, key := range keysToAdd {
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
		AggregateAttribute: v3.AttributeKey{
			Key:      metricToUseForProcessAttributes,
			DataType: v3.AttributeKeyDataTypeFloat64,
		},
		Temporality: v3.Cumulative,
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

		processID := stringData[processPIDAttrKey]
		if _, ok := processAttrs[processID]; !ok {
			processAttrs[processID] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			processAttrs[processID][key.Key] = stringData[key.Key]
		}
	}

	return processAttrs, nil
}

func (p *ProcessesRepo) getTopProcessGroups(ctx context.Context, req model.ProcessListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopProcesses(req)

	queryNames := queryNamesForTopProcesses[req.OrderBy.ColumnName]
	topProcessGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
			query.Filters.Items = append(query.Filters.Items, req.Filters.Items...)
		}
		topProcessGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, topProcessGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topProcessGroupsQueryRangeParams)
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

	paginatedTopProcessGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topProcessGroups := []map[string]string{}
	for _, series := range paginatedTopProcessGroupsSeries {
		topProcessGroups = append(topProcessGroups, series.Labels)
	}
	allProcessGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allProcessGroups = append(allProcessGroups, series.Labels)
	}

	return topProcessGroups, allProcessGroups, nil
}

func (p *ProcessesRepo) GetProcessList(ctx context.Context, req model.ProcessListRequest) (model.ProcessListResponse, error) {
	resp := model.ProcessListResponse{}
	if req.Limit == 0 {
		req.Limit = 10
	}

	// default to cpu order by
	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	// default to process pid group by
	if len(req.GroupBy) == 0 {
		req.GroupBy = []v3.AttributeKey{{Key: processPIDAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := ProcessesTableListQuery.Clone()

	query.Start = req.Start
	query.End = req.End
	query.Step = step

	for _, query := range query.CompositeQuery.BuilderQueries {
		query.StepInterval = step
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			query.Filters.Items = append(query.Filters.Items, req.Filters.Items...)
		}
		query.GroupBy = req.GroupBy
	}

	processAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topProcessGroups, allProcessGroups, err := p.getTopProcessGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topProcessGroup := range topProcessGroups {
		for k, v := range topProcessGroup {
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

	records := []model.ProcessListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {
			record := model.ProcessListRecord{
				ProcessCPU:    -1,
				ProcessMemory: -1,
			}

			pid, ok := row.Data[processPIDAttrKey].(string)
			if ok {
				record.ProcessID = pid
			}

			processCPU, ok := row.Data["F1"].(float64)
			if ok {
				record.ProcessCPU = processCPU
			}

			processMemory, ok := row.Data["C"].(float64)
			if ok {
				record.ProcessMemory = processMemory
			}
			record.Meta = processAttrs[record.ProcessID]
			record.ProcessName = record.Meta[processNameAttrKey]
			record.ProcessCMD = record.Meta[processCMDAttrKey]
			record.ProcessCMDLine = record.Meta[processCMDLineAttrKey]
			records = append(records, record)
		}
	}

	resp.Total = len(allProcessGroups)
	resp.Records = records

	return resp, nil
}
