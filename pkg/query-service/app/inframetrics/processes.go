package inframetrics

import (
	"context"
	"fmt"
	"math"

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

func getGroupKeyForProcesses(record model.ProcessesListRecord, groupBy []v3.AttributeKey) string {
	groupKey := ""
	for _, key := range groupBy {
		groupKey += fmt.Sprintf("%s=%s,", key.Key, record.Meta[key.Key])
	}
	return groupKey
}

func (p *ProcessesRepo) getMetadataAttributes(ctx context.Context, req model.ProcessesListRequest) (map[string]map[string]string, error) {
	processAttrs := map[string]map[string]string{}

	hasProcessID := false
	for _, key := range req.GroupBy {
		if key.Key == "process_pid" {
			hasProcessID = true
		}
	}

	if !hasProcessID {
		req.GroupBy = append(req.GroupBy, v3.AttributeKey{Key: "process_pid"})
	}

	mq := v3.BuilderQuery{
		AggregateAttribute: v3.AttributeKey{
			Key:      "system_cpu_load_average_15m",
			DataType: v3.AttributeKeyDataTypeFloat64,
		},
		Temporality: v3.Unspecified,
		GroupBy:     req.GroupBy,
	}

	query, err := helpers.PrepareTimeseriesFilterQuery(req.Start, req.End, &mq)
	if err != nil {
		return nil, err
	}

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
		processAttrs[stringData["process_pid"]] = stringData
	}

	return processAttrs, nil
}

func (p *ProcessesRepo) GetProcesses(ctx context.Context, req model.ProcessesListRequest) (model.ProcessesListResponse, error) {
	resp := model.ProcessesListResponse{
		Type: "list",
	}

	step := common.MinAllowedStepInterval(req.Start, req.End)

	query := ProcessesTableListQuery.Clone()
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

	formattedResponse, _ := postprocess.PostProcessResult(queryResponse, query)

	if len(formattedResponse) == 0 {
		return resp, nil
	}

	records := []model.ProcessesListRecord{}

	// there should be only one result in the response
	processInfo := formattedResponse[0]

	for _, row := range processInfo.Table.Rows {
		record := model.ProcessesListRecord{
			ProcessCPU:    -1,
			ProcessMemory: -1,
		}

		pid, ok := row.Data["process_pid"].(string)
		if ok {
			record.ProcessID = pid
		}

		processName, ok := row.Data["process_executable_name"].(string)
		if ok {
			record.ProcessName = processName
		}

		processCMD, ok := row.Data["process_command"].(string)
		if ok {
			record.ProcessCMD = processCMD
		}

		processCMDLine, ok := row.Data["process_command_line"].(string)
		if ok {
			record.ProcessCMDLine = processCMDLine
		}

		processCPU, ok := row.Data["F1"].(float64)
		if ok {
			record.ProcessCPU = processCPU
		}

		processMemory, ok := row.Data["F2"].(float64)
		if ok {
			record.ProcessMemory = processMemory
		}
		record.Meta = processAttrs[record.ProcessID]
		records = append(records, record)
	}
	resp.Records = records

	if len(req.GroupBy) > 0 {
		groups := []model.ProcessesListGroup{}

		groupMap := make(map[string][]model.ProcessesListRecord)
		for _, record := range records {
			groupKey := getGroupKeyForProcesses(record, req.GroupBy)
			groupMap[groupKey] = append(groupMap[groupKey], record)
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

			groups = append(groups, model.ProcessesListGroup{
				GroupValues:      groupValues,
				ProcessMemoryAvg: avgMemory,
				ProcessCPUAvg:    avgCPU,
				Records:          records,
			})
		}
		resp.Groups = groups
		resp.Type = "grouped_list"
	}

	return resp, nil
}
