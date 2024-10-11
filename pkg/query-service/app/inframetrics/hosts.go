package inframetrics

import (
	"context"
	"fmt"
	"math"
	"strings"
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
	if req.FilterAttributeKey != "host_name" {
		return attributeValuesResponse, nil
	}
	hostNames := []string{}

	for _, attributeValue := range attributeValuesResponse.StringAttributeValues {
		if strings.Contains(attributeValue, "k8s-infra-otel-agent") {
			continue
		}
		hostNames = append(hostNames, attributeValue)
	}

	req.FilterAttributeKey = "k8s_node_name"
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = "system_cpu_load_average_15m"
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err = h.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	for _, attributeValue := range attributeValuesResponse.StringAttributeValues {
		if strings.Contains(attributeValue, "k8s-infra-otel-agent") {
			continue
		}
		hostNames = append(hostNames, attributeValue)
	}

	return &v3.FilterAttributeValueResponse{StringAttributeValues: hostNames}, nil
}

func getGroupKey(record model.HostListRecord, groupBy []v3.AttributeKey) string {
	groupKey := ""
	for _, key := range groupBy {
		groupKey += fmt.Sprintf("%s=%s,", key.Key, record.Meta[key.Key])
	}
	return groupKey
}

func (h *HostsRepo) getMetadataAttributes(ctx context.Context,
	req model.HostListRequest, hostNameAttrKey string) (map[string]map[string]string, error) {
	hostAttrs := map[string]map[string]string{}

	hasHostName := false
	for _, key := range req.GroupBy {
		if key.Key == hostNameAttrKey {
			hasHostName = true
		}
	}

	if !hasHostName {
		req.GroupBy = append(req.GroupBy, v3.AttributeKey{Key: hostNameAttrKey})
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

	// TODO(srikanthccv): remove this
	// What is happening here?
	// The `PrepareTimeseriesFilterQuery` uses the local time series table for sub-query because each fingerprint
	// goes to same shard.
	// However, in this case, we are interested in the attributes values across all the shards.
	// So, we replace the local time series table with the distributed time series table.
	// See `PrepareTimeseriesFilterQuery` for more details.
	query = strings.Replace(query, ".time_series_v4", ".distributed_time_series_v4", 1)

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

		hostName := stringData[hostNameAttrKey]
		if _, ok := hostAttrs[hostName]; !ok {
			hostAttrs[hostName] = map[string]string{}
		}
		for _, key := range req.GroupBy {
			hostAttrs[hostName][key.Key] = stringData[key.Key]
		}
	}

	return hostAttrs, nil
}

func (h *HostsRepo) getActiveHosts(ctx context.Context,
	req model.HostListRequest, hostNameAttrKey string) (map[string]bool, error) {
	activeStatus := map[string]bool{}
	step := common.MinAllowedStepInterval(req.Start, req.End)

	hasHostName := false
	for _, key := range req.GroupBy {
		if key.Key == hostNameAttrKey {
			hasHostName = true
		}
	}

	if !hasHostName {
		req.GroupBy = append(req.GroupBy, v3.AttributeKey{Key: hostNameAttrKey})
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
			name := series.Labels[hostNameAttrKey]
			activeStatus[name] = true
		}
	}

	return activeStatus, nil
}

func (h *HostsRepo) getHostsForQuery(ctx context.Context,
	req model.HostListRequest, q *v3.QueryRangeParamsV3, hostNameAttrKey string) ([]model.HostListRecord, error) {

	step := common.MinAllowedStepInterval(req.Start, req.End)

	query := q.Clone()
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
			// what is happening here?
			// if the filter has host_name and we are querying for k8s host metrics,
			// we need to replace the host_name with k8s_node_name
			if hostNameAttrKey == "k8s_node_name" {
				for idx, item := range query.Filters.Items {
					if item.Key.Key == "host_name" {
						query.Filters.Items[idx].Key.Key = "k8s_node_name"
					}
				}
			}
		}
	}

	hostAttrs, err := h.getMetadataAttributes(ctx, req, hostNameAttrKey)
	if err != nil {
		return nil, err
	}

	activeHosts, err := h.getActiveHosts(ctx, req, hostNameAttrKey)
	if err != nil {
		return nil, err
	}

	queryResponse, _, err := h.querierV2.QueryRange(ctx, query)
	if err != nil {
		return nil, err
	}

	type hostTSInfo struct {
		cpuTimeSeries    *v3.Series
		memoryTimeSeries *v3.Series
		waitTimeSeries   *v3.Series
		load15TimeSeries *v3.Series
	}
	hostTSInfoMap := map[string]*hostTSInfo{}

	for _, result := range queryResponse {
		for _, series := range result.Series {
			hostName := series.Labels[hostNameAttrKey]
			if _, ok := hostTSInfoMap[hostName]; !ok {
				hostTSInfoMap[hostName] = &hostTSInfo{}
			}
			if result.QueryName == "G" {
				loadSeries := *series
				hostTSInfoMap[hostName].load15TimeSeries = &loadSeries
			}
		}
	}

	query.FormatForWeb = false
	query.CompositeQuery.PanelType = v3.PanelTypeGraph

	formulaResult, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return nil, err
	}

	for _, result := range formulaResult {
		for _, series := range result.Series {
			hostName := series.Labels[hostNameAttrKey]
			if _, ok := hostTSInfoMap[hostName]; !ok {
				hostTSInfoMap[hostName] = &hostTSInfo{}
			}
			if result.QueryName == "F1" {
				hostTSInfoMap[hostName].cpuTimeSeries = series
			} else if result.QueryName == "F2" {
				hostTSInfoMap[hostName].memoryTimeSeries = series
			} else if result.QueryName == "F3" {
				hostTSInfoMap[hostName].waitTimeSeries = series
			}
		}
	}

	query.FormatForWeb = true
	query.CompositeQuery.PanelType = v3.PanelTypeTable
	formattedResponse, _ := postprocess.PostProcessResult(queryResponse, query)

	records := []model.HostListRecord{}

	// there should be only one result in the response
	hostsInfo := formattedResponse[0]
	// each row represents a host
	for _, row := range hostsInfo.Table.Rows {
		record := model.HostListRecord{
			CPU:    -1,
			Memory: -1,
			Wait:   -1,
			Load15: -1,
		}

		hostName, ok := row.Data[hostNameAttrKey].(string)
		if ok {
			record.HostName = hostName
		}

		osType, ok := row.Data["os_type"].(string)
		if ok {
			record.OS = osType
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
		load15, ok := row.Data["G"].(float64)
		if ok {
			record.Load15 = load15
		}
		record.Meta = hostAttrs[record.HostName]
		record.Active = activeHosts[record.HostName]
		if hostTSInfoMap[record.HostName] != nil {
			record.CPUTimeSeries = hostTSInfoMap[record.HostName].cpuTimeSeries
			record.MemoryTimeSeries = hostTSInfoMap[record.HostName].memoryTimeSeries
			record.WaitTimeSeries = hostTSInfoMap[record.HostName].waitTimeSeries
			record.Load15TimeSeries = hostTSInfoMap[record.HostName].load15TimeSeries
		}
		records = append(records, record)
	}

	return records, nil
}

func dedupRecords(records []model.HostListRecord) []model.HostListRecord {
	seen := map[string]bool{}
	deduped := []model.HostListRecord{}
	for _, record := range records {
		if !seen[record.HostName] {
			seen[record.HostName] = true
			deduped = append(deduped, record)
		}
	}
	return deduped
}

func (h *HostsRepo) GetHostList(ctx context.Context, req model.HostListRequest) (model.HostListResponse, error) {
	if req.Limit == 0 {
		req.Limit = 10
	}

	resp := model.HostListResponse{
		Type: "list",
	}

	vmRecords, err := h.getHostsForQuery(ctx, req, &NonK8STableListQuery, "host_name")
	if err != nil {
		return resp, err
	}
	k8sRecords, err := h.getHostsForQuery(ctx, req, &K8STableListQuery, "k8s_node_name")
	if err != nil {
		return resp, err
	}

	records := append(vmRecords, k8sRecords...)

	// since we added the fix for incorrect host name, it is possible that both host_name and k8s_node_name
	// are present in the response. we need to dedup the results.
	records = dedupRecords(records)

	resp.Total = len(records)

	if req.Offset > 0 {
		records = records[req.Offset:]
	}
	if req.Limit > 0 && len(records) > req.Limit {
		records = records[:req.Limit]
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
			var avgCPU, avgMemory, avgWait, avgLoad15 float64
			var validCPU, validMemory, validWait, validLoad15, activeHosts int
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
				if !math.IsNaN(record.Load15) {
					avgLoad15 += record.Load15
					validLoad15++
				}
				if record.Active {
					activeHosts++
				}
			}
			avgCPU /= float64(validCPU)
			avgMemory /= float64(validMemory)
			avgWait /= float64(validWait)
			avgLoad15 /= float64(validLoad15)
			inactiveHosts := len(records) - activeHosts

			// take any record and make it as the group meta
			firstRecord := records[0]
			var groupValues []string
			for _, key := range req.GroupBy {
				groupValues = append(groupValues, firstRecord.Meta[key.Key])
			}
			hostNames := []string{}
			for _, record := range records {
				hostNames = append(hostNames, record.HostName)
			}

			groups = append(groups, model.HostListGroup{
				GroupValues:    groupValues,
				Active:         activeHosts,
				Inactive:       inactiveHosts,
				GroupCPUAvg:    avgCPU,
				GroupMemoryAvg: avgMemory,
				GroupWaitAvg:   avgWait,
				GroupLoad15Avg: avgLoad15,
				HostNames:      hostNames,
			})
		}
		resp.Groups = groups
		resp.Type = "grouped_list"
	}

	return resp, nil
}
