package inframetrics

import (
	"context"
	"fmt"
	"math"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/slices"
)

type HostsRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

var pointAttrsToIgnore = []string{
	"state",
	"cpu",
	"device",
	"direction",
	"mode",
	"mountpoint",
	"type",
	"process.cgroup",
	"process.command",
	"process.command_line",
	"process.executable.name",
	"process.executable.path",
	"process.owner",
	"process.parent_pid",
	"process.pid",
}

func NewHostsRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *HostsRepo {
	return &HostsRepo{reader: reader, querierV2: querierV2}
}

func (h *HostsRepo) GetHostAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	// TODO(srikanthccv): remove hardcoded metric name and support keys from any system metric
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = "system_cpu_load_average_15m"
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeKeysResponse, err := h.reader.GetMetricAttributeKeys(ctx, &req)
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

func (h *HostsRepo) GetHostAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = "system_cpu_load_average_15m"
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := h.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	return attributeValuesResponse, nil
}

func getGroupKey(record model.HostListRecord, groupBy []v3.AttributeKey) string {
	groupKey := ""
	for _, key := range groupBy {
		groupKey += fmt.Sprintf("%s=%s,", key.Key, record.Meta[key.Key])
	}
	return groupKey
}

func (h *HostsRepo) getMetadataAttributes(ctx context.Context, req model.HostListRequest) (map[string]map[string]string, error) {
	hostAttrs := map[string]map[string]string{}

	hasHostName := false
	for _, key := range req.GroupBy {
		if key.Key == "host_name" {
			hasHostName = true
		}
	}

	if !hasHostName {
		req.GroupBy = append(req.GroupBy, v3.AttributeKey{Key: "host_name"})
	}

	mq := v3.BuilderQuery{
		AggregateAttribute: v3.AttributeKey{
			Key:      "system_cpu_load_average_15m",
			DataType: v3.AttributeKeyDataTypeFloat64,
		},
		Temporality: v3.Cumulative,
		GroupBy:     req.GroupBy,
	}
	query, err := helpers.PrepareTimeseriesFilterQuery(req.Start, req.End, &mq)
	if err != nil {
		return nil, err
	}

	attrsListResponse, err := h.reader.GetListResultV3(ctx, query)
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

		hostName := stringData["host_name"]
		if _, ok := hostAttrs[hostName]; !ok {
			hostAttrs[hostName] = map[string]string{}
		}
		for _, key := range req.GroupBy {
			hostAttrs[hostName][key.Key] = stringData[key.Key]
		}
	}

	return hostAttrs, nil
}

func (h *HostsRepo) getActiveHosts(ctx context.Context, req model.HostListRequest) (map[string]bool, error) {
	activeStatus := map[string]bool{}
	step := common.MinAllowedStepInterval(req.Start, req.End)

	hasHostName := false
	for _, key := range req.GroupBy {
		if key.Key == "host_name" {
			hasHostName = true
		}
	}

	if !hasHostName {
		req.GroupBy = append(req.GroupBy, v3.AttributeKey{Key: "host_name"})
	}

	params := v3.QueryRangeParamsV3{
		Start: time.Now().Add(-time.Hour).UTC().UnixMilli(),
		End:   time.Now().UTC().UnixMilli(),
		Step:  step,
		CompositeQuery: &v3.CompositeQuery{
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					QueryName:    "A",
					StepInterval: step,
					DataSource:   v3.DataSourceMetrics,
					AggregateAttribute: v3.AttributeKey{
						Key:      "system_cpu_load_average_15m",
						DataType: v3.AttributeKeyDataTypeFloat64,
					},
					Temporality:      v3.Unspecified,
					Filters:          req.Filters,
					GroupBy:          req.GroupBy,
					Expression:       "A",
					TimeAggregation:  v3.TimeAggregationAvg,
					SpaceAggregation: v3.SpaceAggregationAvg,
					Disabled:         false,
				},
			},
			QueryType: v3.QueryTypeBuilder,
			PanelType: v3.PanelTypeGraph,
		},
	}

	queryResponse, _, err := h.querierV2.QueryRange(ctx, &params)
	if err != nil {
		return nil, err
	}

	for _, result := range queryResponse {
		for _, series := range result.Series {
			name := series.Labels["host_name"]
			activeStatus[name] = true
		}
	}

	return activeStatus, nil
}

func (h *HostsRepo) GetHostList(ctx context.Context, req model.HostListRequest) (model.HostListResponse, error) {
	resp := model.HostListResponse{
		Type: "list",
	}

	step := common.MinAllowedStepInterval(req.Start, req.End)

	query := TableListQuery.Clone()
	query.Start = req.Start
	query.End = req.End
	query.Step = step

	for _, query := range query.CompositeQuery.BuilderQueries {
		query.StepInterval = step
		if req.Filters != nil && len(req.Filters.Items) > 0 {
			query.Filters.Items = append(query.Filters.Items, req.Filters.Items...)
		}
	}

	hostAttrs, err := h.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	activeHosts, err := h.getActiveHosts(ctx, req)
	if err != nil {
		return resp, err
	}

	queryResponse, _, err := h.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	formattedResponse, _ := postprocess.PostProcessResult(queryResponse, query)

	records := []model.HostListRecord{}

	// there should be only one result in the response
	hostsInfo := formattedResponse[0]
	// each row represents a host
	for _, row := range hostsInfo.Table.Rows {
		record := model.HostListRecord{
			CPU:     -1,
			Memory:  -1,
			Wait:    -1,
			Storage: -1,
		}

		hostName, ok := row.Data["host_name"].(string)
		if ok {
			record.HostName = hostName
		}

		cpu, ok := row.Data["F1"].(float64)
		if ok {
			record.CPU = cpu
		}
		memory, ok := row.Data["F2"].(float64)
		if ok {
			record.Memory = memory
		}
		wait, ok := row.Data["F3"].(float64)
		if ok {
			record.Wait = wait
		}
		storage, ok := row.Data["F4"].(float64)
		if ok {
			record.Storage = storage
		}
		record.Meta = hostAttrs[record.HostName]
		record.Active = activeHosts[record.HostName]
		records = append(records, record)
	}
	resp.Records = records

	if len(req.GroupBy) > 0 {
		groups := []model.HostListGroup{}

		groupMap := make(map[string][]model.HostListRecord)
		for _, record := range records {
			groupKey := getGroupKey(record, req.GroupBy)
			if _, ok := groupMap[groupKey]; !ok {
				groupMap[groupKey] = []model.HostListRecord{record}
			} else {
				groupMap[groupKey] = append(groupMap[groupKey], record)
			}
		}

		// calculate the group stats, active hosts, etc.
		for _, records := range groupMap {
			var avgCPU, avgMemory, avgWait, avgStorage float64
			var validCPU, validMemory, validWait, validStorage, activeHosts int
			for _, record := range records {
				if !math.IsNaN(record.CPU) {
					avgCPU += record.CPU
					validCPU++
				}
				if !math.IsNaN(record.Memory) {
					avgMemory += record.Memory
					validMemory++
				}
				if !math.IsNaN(record.Wait) {
					avgWait += record.Wait
					validWait++
				}
				if !math.IsNaN(record.Storage) {
					avgStorage += record.Storage
					validStorage++
				}
				if record.Active {
					activeHosts++
				}
			}
			avgCPU /= float64(validCPU)
			avgMemory /= float64(validMemory)
			avgWait /= float64(validWait)
			avgStorage /= float64(validStorage)
			inactiveHosts := len(records) - activeHosts

			// take any record and make it as the group meta
			firstRecord := records[0]
			var groupValues []string
			for _, key := range req.GroupBy {
				groupValues = append(groupValues, firstRecord.Meta[key.Key])
			}

			groups = append(groups, model.HostListGroup{
				GroupValues:     groupValues,
				Active:          activeHosts,
				Inactive:        inactiveHosts,
				Records:         records,
				GroupCPUAvg:     avgCPU,
				GroupMemoryAvg:  avgMemory,
				GroupWaitAvg:    avgWait,
				GroupStorageAvg: avgStorage,
			})
		}
		resp.Groups = groups
		resp.Type = "grouped_list"
	}

	return resp, nil
}
