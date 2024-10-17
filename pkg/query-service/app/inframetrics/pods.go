package inframetrics

import (
	"context"
	"math"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/slices"
)

var (
	metricToUseForPods = "k8s_pod_cpu_utilization"

	podAttrsToEnrich = []string{"k8s_pod_uid", "k8s_pod_name", "k8s_namespace_name", "k8s_node_name", "k8s_deployment_name", "k8s_statefulset_name", "k8s_daemonset_name", "k8s_job_name", "k8s_cronjob_name"}

	k8sPodUIDAttrKey  = "k8s_pod_uid"
	k8sPodNameAttrKey = "k8s_pod_name"
)

type PodsRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

func NewPodsRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *PodsRepo {
	return &PodsRepo{reader: reader, querierV2: querierV2}
}

func (p *PodsRepo) GetPodAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	// TODO(srikanthccv): remove hardcoded metric name and support keys from any pod metric
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForPods
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

func (p *PodsRepo) GetPodAttributeValues(ctx context.Context, req v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForPods
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := p.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	return attributeValuesResponse, nil
}

func getGroupKeyForPods(record model.PodListRecord, groupBy []v3.AttributeKey) string {
	groupKey := ""
	for _, key := range groupBy {
		groupKey += record.Meta[key.Key]
	}
	return groupKey
}

func (p *PodsRepo) getMetadataAttributes(ctx context.Context, req model.PodListRequest) (map[string]map[string]string, error) {
	podAttrs := map[string]map[string]string{}

	for _, key := range podAttrsToEnrich {
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
			Key:      metricToUseForPods,
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

		podUID := stringData[k8sPodUIDAttrKey]
		if _, ok := podAttrs[podUID]; !ok {
			podAttrs[podUID] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			podAttrs[podUID][key.Key] = stringData[key.Key]
		}
	}

	return podAttrs, nil
}

func (p *PodsRepo) GetPodList(ctx context.Context, req model.PodListRequest) (model.PodListResponse, error) {
	if req.Limit == 0 {
		req.Limit = 10
	}

	resp := model.PodListResponse{
		Type: model.ResponseTypeList,
	}

	step := common.MinAllowedStepInterval(req.Start, req.End)

	query := PodsTableListQuery.Clone()
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

	podAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	type podTSInfo struct {
		CPUTimeSeries           *v3.Series `json:"cpu_time_series"`
		MemoryTimeSeries        *v3.Series `json:"memory_time_series"`
		CPURequestTimeSeries    *v3.Series `json:"cpu_request_time_series"`
		CPULimitTimeSeries      *v3.Series `json:"cpu_limit_time_series"`
		MemoryRequestTimeSeries *v3.Series `json:"memory_request_time_series"`
		MemoryLimitTimeSeries   *v3.Series `json:"memory_limit_time_series"`
	}
	podTSInfoMap := map[string]*podTSInfo{}

	for _, result := range queryResponse {
		for _, series := range result.Series {
			podUID := series.Labels[k8sPodUIDAttrKey]
			if _, ok := podTSInfoMap[podUID]; !ok {
				podTSInfoMap[podUID] = &podTSInfo{}
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
			podUID := series.Labels[k8sPodUIDAttrKey]
			if _, ok := podTSInfoMap[podUID]; !ok {
				podTSInfoMap[podUID] = &podTSInfo{}
			}
			loadSeries := *series
			if result.QueryName == "A" {
				podTSInfoMap[podUID].CPUTimeSeries = &loadSeries
			} else if result.QueryName == "B" {
				podTSInfoMap[podUID].CPURequestTimeSeries = &loadSeries
			} else if result.QueryName == "C" {
				podTSInfoMap[podUID].CPULimitTimeSeries = &loadSeries
			} else if result.QueryName == "D" {
				podTSInfoMap[podUID].MemoryTimeSeries = &loadSeries
			} else if result.QueryName == "E" {
				podTSInfoMap[podUID].MemoryRequestTimeSeries = &loadSeries
			} else if result.QueryName == "F" {
				podTSInfoMap[podUID].MemoryLimitTimeSeries = &loadSeries
			}
		}
	}

	query.FormatForWeb = true
	query.CompositeQuery.PanelType = v3.PanelTypeTable

	formattedResponse, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	records := []model.PodListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {
			record := model.PodListRecord{
				PodCPU:           -1,
				PodCPURequest:    -1,
				PodCPULimit:      -1,
				PodMemory:        -1,
				PodMemoryRequest: -1,
				PodMemoryLimit:   -1,
			}

			if podUID, ok := row.Data[k8sPodUIDAttrKey].(string); ok {
				record.PodUID = podUID
			}

			if cpu, ok := row.Data["A"].(float64); ok {
				record.PodCPU = cpu
			}
			if cpuRequest, ok := row.Data["B"].(float64); ok {
				record.PodCPURequest = cpuRequest
			}

			if cpuLimit, ok := row.Data["C"].(float64); ok {
				record.PodCPULimit = cpuLimit
			}

			if memory, ok := row.Data["D"].(float64); ok {
				record.PodMemory = memory
			}

			if memoryRequest, ok := row.Data["E"].(float64); ok {
				record.PodMemoryRequest = memoryRequest
			}

			if memoryLimit, ok := row.Data["F"].(float64); ok {
				record.PodMemoryLimit = memoryLimit
			}

			if _, ok := podAttrs[record.PodUID]; ok {
				record.Meta = podAttrs[record.PodUID]
			}

			record.PodName = record.Meta[k8sPodNameAttrKey]

			if _, ok := podTSInfoMap[record.PodUID]; ok {
				record.PodCPUTimeSeries = podTSInfoMap[record.PodUID].CPUTimeSeries
				record.PodMemoryTimeSeries = podTSInfoMap[record.PodUID].MemoryTimeSeries
				record.PodCPURequestTimeSeries = podTSInfoMap[record.PodUID].CPURequestTimeSeries
				record.PodCPULimitTimeSeries = podTSInfoMap[record.PodUID].CPULimitTimeSeries
				record.PodMemoryRequestTimeSeries = podTSInfoMap[record.PodUID].MemoryRequestTimeSeries
				record.PodMemoryLimitTimeSeries = podTSInfoMap[record.PodUID].MemoryLimitTimeSeries
			}
			records = append(records, record)
		}
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
		groups := []model.PodListGroup{}

		groupMap := make(map[string][]model.PodListRecord)
		for _, record := range records {
			groupKey := getGroupKeyForPods(record, req.GroupBy)
			if _, ok := groupMap[groupKey]; !ok {
				groupMap[groupKey] = []model.PodListRecord{record}
			} else {
				groupMap[groupKey] = append(groupMap[groupKey], record)
			}
		}

		for _, group := range groupMap {
			groupCPUAvg := 0.0
			groupMemoryAvg := 0.0
			groupCPURequestAvg := 0.0
			groupCPULimitAvg := 0.0
			groupMemoryRequestAvg := 0.0
			groupMemoryLimitAvg := 0.0
			var validCPU, validMemory, validCPURequest, validCPULimit, validMemoryRequest, validMemoryLimit int

			for _, record := range group {
				if !math.IsNaN(record.PodCPU) {
					groupCPUAvg += record.PodCPU
					validCPU++
				}
				if !math.IsNaN(record.PodMemory) {
					groupMemoryAvg += record.PodMemory
					validMemory++
				}
				if !math.IsNaN(record.PodCPURequest) {
					groupCPURequestAvg += record.PodCPURequest
					validCPURequest++
				}
				if !math.IsNaN(record.PodCPULimit) {
					groupCPULimitAvg += record.PodCPULimit
					validCPULimit++
				}
				if !math.IsNaN(record.PodMemoryRequest) {
					groupMemoryRequestAvg += record.PodMemoryRequest
					validMemoryRequest++
				}
				if !math.IsNaN(record.PodMemoryLimit) {
					groupMemoryLimitAvg += record.PodMemoryLimit
					validMemoryLimit++
				}
			}

			groupCPUAvg /= float64(validCPU)
			groupMemoryAvg /= float64(validMemory)
			groupCPURequestAvg /= float64(validCPURequest)
			groupCPULimitAvg /= float64(validCPULimit)
			groupMemoryRequestAvg /= float64(validMemoryRequest)
			groupMemoryLimitAvg /= float64(validMemoryLimit)

			// take any record and make it as the group meta
			firstRecord := records[0]
			var groupValues []string
			for _, key := range req.GroupBy {
				groupValues = append(groupValues, firstRecord.Meta[key.Key])
			}

			var podNames []string
			for _, record := range group {
				podNames = append(podNames, record.PodName)
			}

			groups = append(groups, model.PodListGroup{
				GroupValues:           groupValues,
				GroupCPUAvg:           groupCPUAvg,
				GroupMemoryAvg:        groupMemoryAvg,
				GroupCPURequestAvg:    groupCPURequestAvg,
				GroupCPULimitAvg:      groupCPULimitAvg,
				GroupMemoryRequestAvg: groupMemoryRequestAvg,
				GroupMemoryLimitAvg:   groupMemoryLimitAvg,
				PodNames:              podNames,
			})
		}

		resp.Groups = groups
		resp.Type = model.ResponseTypeGroupedList
	}

	return resp, nil
}
