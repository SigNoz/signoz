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
)

var (
	metricToUseForNodes = "k8s_node_cpu_utilization"

	nodeAttrsToEnrich = []string{"k8s_node_name", "k8s_node_uid"}

	k8sNodeUIDAttrKey  = "k8s_node_uid"
	k8sNodeNameAttrKey = "k8s_node_name"
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

func getGroupKeyForNodes(record model.NodeListRecord, groupBy []v3.AttributeKey) string {
	groupKey := ""
	for _, key := range groupBy {
		groupKey += record.Meta[key.Key]
	}
	return groupKey
}

func (n *NodesRepo) getMetadataAttributes(ctx context.Context, req model.NodeListRequest) (map[string]map[string]string, error) {
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

	attrsListResponse, err := n.reader.GetListResultV3(ctx, query)
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

		nodeUID := stringData[k8sNodeUIDAttrKey]
		if _, ok := nodeAttrs[nodeUID]; !ok {
			nodeAttrs[nodeUID] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			nodeAttrs[nodeUID][key.Key] = stringData[key.Key]
		}
	}

	return nodeAttrs, nil
}

func (n *NodesRepo) GetNodeList(ctx context.Context, req model.NodeListRequest) (model.NodeListResponse, error) {
	if req.Limit == 0 {
		req.Limit = 50
	}

	resp := model.NodeListResponse{
		Type: model.ResponseTypeList,
	}

	step := common.MinAllowedStepInterval(req.Start, req.End)

	query := NodesTableListQuery.Clone()
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

	nodeAttrs, err := n.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	queryResponse, _, err := n.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	type nodeTSInfo struct {
		CPUTimeSeries    *v3.Series `json:"cpu_time_series"`
		MemoryTimeSeries *v3.Series `json:"memory_time_series"`
	}

	nodeTSInfoMap := map[string]*nodeTSInfo{}

	for _, result := range queryResponse {
		for _, series := range result.Series {
			nodeID := series.Labels[k8sNodeNameAttrKey]
			if _, ok := nodeTSInfoMap[nodeID]; !ok {
				nodeTSInfoMap[nodeID] = &nodeTSInfo{}
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
			nodeUID := series.Labels[k8sNodeUIDAttrKey]
			if _, ok := nodeTSInfoMap[nodeUID]; !ok {
				nodeTSInfoMap[nodeUID] = &nodeTSInfo{}
			}
			loadSeries := *series
			if result.QueryName == "A" {
				nodeTSInfoMap[nodeUID].CPUTimeSeries = &loadSeries
			} else if result.QueryName == "B" {
				nodeTSInfoMap[nodeUID].MemoryTimeSeries = &loadSeries
			}
		}
	}

	query.FormatForWeb = true
	query.CompositeQuery.PanelType = v3.PanelTypeTable

	formattedResponse, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	records := []model.NodeListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {
			record := model.NodeListRecord{
				NodeCPU:    -1,
				NodeMemory: -1,
			}

			if nodeUID, ok := row.Data[k8sNodeUIDAttrKey].(string); ok {
				record.NodeUID = nodeUID
			}
			if cpu, ok := row.Data["A"].(float64); ok {
				record.NodeCPU = cpu
			}
			if memory, ok := row.Data["B"].(float64); ok {
				record.NodeMemory = memory
			}
			if nodeTSInfoMap[record.NodeUID] != nil {
				record.NodeCPUTimeSeries = nodeTSInfoMap[record.NodeUID].CPUTimeSeries
				record.NodeMemoryTimeSeries = nodeTSInfoMap[record.NodeUID].MemoryTimeSeries
			}
			record.Meta = nodeAttrs[record.NodeUID]
			record.NodeName = record.Meta[k8sNodeNameAttrKey]
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
		groups := []model.NodeListGroup{}

		groupMap := make(map[string][]model.NodeListRecord)
		for _, record := range records {
			groupKey := getGroupKeyForNodes(record, req.GroupBy)
			if _, ok := groupMap[groupKey]; !ok {
				groupMap[groupKey] = []model.NodeListRecord{record}

			} else {
				groupMap[groupKey] = append(groupMap[groupKey], record)
			}
		}

		for _, group := range groupMap {
			groupCPUAvg := 0.0
			groupMemoryAvg := 0.0

			var validCPU, validMemory int

			for _, record := range group {
				if !math.IsNaN(record.NodeCPU) {
					groupCPUAvg += record.NodeCPU
					validCPU++
				}
				if !math.IsNaN(record.NodeMemory) {
					groupMemoryAvg += record.NodeMemory
					validMemory++
				}
			}

			groupCPUAvg /= float64(validCPU)
			groupMemoryAvg /= float64(validMemory)

			// take any record and make it as the group meta
			firstRecord := records[0]
			var groupValues []string
			for _, key := range req.GroupBy {
				groupValues = append(groupValues, firstRecord.Meta[key.Key])
			}

			var nodeNames []string
			for _, record := range group {
				nodeNames = append(nodeNames, record.NodeName)
			}

			groups = append(groups, model.NodeListGroup{
				GroupValues:    groupValues,
				GroupCPUAvg:    groupCPUAvg,
				GroupMemoryAvg: groupMemoryAvg,
				NodeNames:      nodeNames,
			})
		}

		resp.Groups = groups
		resp.Type = model.ResponseTypeGroupedList
	}

	return resp, nil
}
