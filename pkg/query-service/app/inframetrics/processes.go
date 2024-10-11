package inframetrics

import (
	"context"
	"fmt"
	"math"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/slices"
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

func getGroupKeyForProcesses(record model.ProcessListRecord, groupBy []v3.AttributeKey) string {
	groupKey := ""
	for _, key := range groupBy {
		groupKey += fmt.Sprintf("%s=%s,", key.Key, record.Meta[key.Key])
	}
	return groupKey
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
			Key:      "process_memory_usage",
			DataType: v3.AttributeKeyDataTypeFloat64,
		},
		Temporality: v3.Cumulative,
		GroupBy:     req.GroupBy,
	}

	query, err := helpers.PrepareTimeseriesFilterQuery(req.Start, req.End, &mq)
	if err != nil {
		return nil, err
	}

	// TODO(srikanthccv): remove this
	// What is happening here?
	// The `PrepareTimeseriesFilterQuery` uses the local time series table for sub-query because each fingerprint
	// goes to same shard.
	// However, in this case, we are interested in the attributes values across all the shards.
	// So, we replace the local time series table with the distributed time series table.
	// See `PrepareTimeseriesFilterQuery` for more details.
	query = strings.Replace(query, ".time_series_v4", ".distributed_time_series_v4", 1)

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

		pid := stringData["process_pid"]
		if _, ok := processAttrs[pid]; !ok {
			processAttrs[pid] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			processAttrs[pid][key.Key] = stringData[key.Key]
		}
	}

	return processAttrs, nil
}

func (p *ProcessesRepo) GetProcessList(ctx context.Context, req model.ProcessListRequest) (model.ProcessListResponse, error) {
	if req.Limit == 0 {
		req.Limit = 10
	}

	resp := model.ProcessListResponse{
		Type: "list",
	}

	step := common.MinAllowedStepInterval(req.Start, req.End)

	query := ProcessesTableListQuery.Clone()
	if req.OrderBy != nil {
		for _, q := range query.CompositeQuery.BuilderQueries {
			q.OrderBy = []v3.OrderBy{*req.OrderBy}
		}
	}

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
	}

	processAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	type processTSInfo struct {
		CpuTimeSeries    *v3.Series `json:"cpu_time_series"`
		MemoryTimeSeries *v3.Series `json:"memory_time_series"`
	}
	processTSInfoMap := map[string]*processTSInfo{}

	for _, result := range queryResponse {
		for _, series := range result.Series {
			pid := series.Labels["process_pid"]
			if _, ok := processTSInfoMap[pid]; !ok {
				processTSInfoMap[pid] = &processTSInfo{}
			}
		}
	}

	query.FormatForWeb = false
	query.CompositeQuery.PanelType = v3.PanelTypeGraph

	formulaResult, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	for _, result := range formulaResult {
		for _, series := range result.Series {
			pid := series.Labels["process_pid"]
			if _, ok := processTSInfoMap[pid]; !ok {
				processTSInfoMap[pid] = &processTSInfo{}
			}
			loadSeries := *series
			if result.QueryName == "F1" {
				processTSInfoMap[pid].CpuTimeSeries = &loadSeries
			} else if result.QueryName == "C" {
				processTSInfoMap[pid].MemoryTimeSeries = &loadSeries
			}
		}
	}

	query.FormatForWeb = true
	query.CompositeQuery.PanelType = v3.PanelTypeTable

	formattedResponse, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	if len(formattedResponse) == 0 {
		return resp, nil
	}

	records := []model.ProcessListRecord{}

	// there should be only one result in the response
	processInfo := formattedResponse[0]

	for _, row := range processInfo.Table.Rows {
		record := model.ProcessListRecord{
			ProcessCPU:    -1,
			ProcessMemory: -1,
		}

		pid, ok := row.Data["process_pid"].(string)
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
		if processTSInfoMap[record.ProcessID] != nil {
			record.ProcessCPUTimeSeries = processTSInfoMap[record.ProcessID].CpuTimeSeries
			record.ProcessMemoryTimeSeries = processTSInfoMap[record.ProcessID].MemoryTimeSeries
		}
		record.ProcessName = record.Meta["process_executable_name"]
		record.ProcessCMD = record.Meta["process_command"]
		record.ProcessCMDLine = record.Meta["process_command_line"]
		records = append(records, record)
	}

	resp.Total = len(records)

	if req.Offset > 0 {
		records = records[req.Offset:]
	}
	if req.Limit > 0 && len(records) > req.Limit {
		records = records[:req.Limit]
	}
	resp.Records = records

	if len(req.GroupBy) > 0 {
		groups := []model.ProcessListGroup{}

		groupMap := make(map[string][]model.ProcessListRecord)
		for _, record := range records {
			groupKey := getGroupKeyForProcesses(record, req.GroupBy)
			if _, ok := groupMap[groupKey]; !ok {
				groupMap[groupKey] = []model.ProcessListRecord{record}
			} else {
				groupMap[groupKey] = append(groupMap[groupKey], record)
			}
		}

		for _, records := range groupMap {
			var avgCPU, avgMemory float64
			var validCPU, validMemory int
			for _, record := range records {
				if !math.IsNaN(record.ProcessCPU) {
					avgCPU += record.ProcessCPU
					validCPU++
				}
				if !math.IsNaN(record.ProcessMemory) {
					avgMemory += record.ProcessMemory
					validMemory++
				}
			}
			avgCPU /= float64(validCPU)
			avgMemory /= float64(validMemory)

			// take any record and make it as the group meta
			firstRecord := records[0]
			var groupValues []string
			for _, key := range req.GroupBy {
				groupValues = append(groupValues, firstRecord.Meta[key.Key])
			}
			processNames := []string{}
			for _, record := range records {
				processNames = append(processNames, record.ProcessName)
			}

			groups = append(groups, model.ProcessListGroup{
				GroupValues:    groupValues,
				GroupCPUAvg:    avgCPU,
				GroupMemoryAvg: avgMemory,
				ProcessNames:   processNames,
			})
		}
		resp.Groups = groups
		resp.Type = "grouped_list"
	}

	return resp, nil
}
