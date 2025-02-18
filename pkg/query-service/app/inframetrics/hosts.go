package inframetrics

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
)

type HostsRepo struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
}

var (
	// we don't have a way to get the resource attributes from the current time series table
	// but we only want to suggest resource attributes for system metrics,
	// this is a list of attributes that we skip from all labels as they are data point attributes
	// TODO(srikanthccv): remove this once we have a way to get resource attributes

	pointAttrsToIgnore = []string{
		"state",
		"cpu",
		"device",
		"direction",
		"mode",
		"mountpoint",
		"type",
		"os_type",
		"process_cgroup",
		"process_command",
		"process_command_line",
		"process_executable_name",
		"process_executable_path",
		"process_owner",
		"process_parent_pid",
		"process_pid",
	}

	queryNamesForTopHosts = map[string][]string{
		"cpu":    {"A", "B", "F1"},
		"memory": {"C", "D", "F2"},
		"wait":   {"E", "F", "F3"},
		"load15": {"G"},
	}

	// TODO(srikanthccv): remove hardcoded metric name and support keys from any system metric
	metricToUseForHostAttributes = "system_cpu_load_average_15m"
	hostNameAttrKey              = "host_name"
	agentNameToIgnore            = "k8s-infra-otel-agent"
	hostAttrsToEnrich            = []string{
		"os_type",
	}
	metricNamesForHosts = map[string]string{
		"cpu":    "system_cpu_time",
		"memory": "system_memory_usage",
		"load15": "system_cpu_load_average_15m",
		"wait":   "system_cpu_time",
	}
)

func NewHostsRepo(reader interfaces.Reader, querierV2 interfaces.Querier) *HostsRepo {
	return &HostsRepo{reader: reader, querierV2: querierV2}
}

func (h *HostsRepo) GetHostAttributeKeys(ctx context.Context, req v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	// TODO(srikanthccv): remove hardcoded metric name and support keys from any system metric
	req.DataSource = v3.DataSourceMetrics
	req.AggregateAttribute = metricToUseForHostAttributes
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
	req.AggregateAttribute = metricToUseForHostAttributes
	if req.Limit == 0 {
		req.Limit = 50
	}

	attributeValuesResponse, err := h.reader.GetMetricAttributeValues(ctx, &req)
	if err != nil {
		return nil, err
	}
	if req.FilterAttributeKey != hostNameAttrKey {
		return attributeValuesResponse, nil
	}
	hostNames := []string{}

	for _, attributeValue := range attributeValuesResponse.StringAttributeValues {
		if strings.Contains(attributeValue, agentNameToIgnore) {
			continue
		}
		hostNames = append(hostNames, attributeValue)
	}

	return &v3.FilterAttributeValueResponse{StringAttributeValues: hostNames}, nil
}

func (h *HostsRepo) getActiveHosts(ctx context.Context, req model.HostListRequest) (map[string]bool, error) {
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
		Start: time.Now().Add(-time.Minute * 10).UTC().UnixMilli(),
		End:   time.Now().UTC().UnixMilli(),
		Step:  step,
		CompositeQuery: &v3.CompositeQuery{
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					QueryName:    "A",
					StepInterval: step,
					DataSource:   v3.DataSourceMetrics,
					AggregateAttribute: v3.AttributeKey{
						Key:      metricToUseForHostAttributes,
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

func (h *HostsRepo) getMetadataAttributes(ctx context.Context, req model.HostListRequest) (map[string]map[string]string, error) {
	hostAttrs := map[string]map[string]string{}

	for _, key := range hostAttrsToEnrich {
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
			Key:      metricToUseForHostAttributes,
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

func (h *HostsRepo) getTopHostGroups(ctx context.Context, req model.HostListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopHosts(req)

	queryNames := queryNamesForTopHosts[req.OrderBy.ColumnName]
	topHostGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topHostGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := h.querierV2.QueryRange(ctx, topHostGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topHostGroupsQueryRangeParams)
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

	paginatedTopHostGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topHostGroups := []map[string]string{}
	for _, series := range paginatedTopHostGroupsSeries {
		topHostGroups = append(topHostGroups, series.Labels)
	}
	allHostGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allHostGroups = append(allHostGroups, series.Labels)
	}

	return topHostGroups, allHostGroups, nil
}

func (h *HostsRepo) DidSendHostMetricsData(ctx context.Context, req model.HostListRequest) (bool, error) {

	names := []string{}
	for _, metricName := range metricNamesForHosts {
		names = append(names, metricName)
	}

	namesStr := "'" + strings.Join(names, "','") + "'"

	query := fmt.Sprintf("SELECT count() FROM %s.%s WHERE metric_name IN (%s)",
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME, namesStr)

	count, err := h.reader.GetCountOfThings(ctx, query)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (h *HostsRepo) IsSendingK8SAgentMetrics(ctx context.Context, req model.HostListRequest) ([]string, []string, error) {
	names := []string{}
	for _, metricName := range metricNamesForHosts {
		names = append(names, metricName)
	}
	namesStr := "'" + strings.Join(names, "','") + "'"

	queryForRecentFingerprints := fmt.Sprintf(`
	SELECT DISTINCT fingerprint
	FROM %s.%s
	WHERE metric_name IN (%s)
		AND unix_milli >= toUnixTimestamp(now() - INTERVAL 5 MINUTE) * 1000`,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_SAMPLES_V4_TABLENAME, namesStr)

	query := fmt.Sprintf(`
	SELECT DISTINCT JSONExtractString(labels, 'k8s_cluster_name') as k8s_cluster_name, JSONExtractString(labels, 'k8s_node_name') as k8s_node_name
	FROM %s.%s
	WHERE metric_name IN (%s)
		AND unix_milli >= toUnixTimestamp(now() - INTERVAL 60 MINUTE) * 1000
		AND JSONExtractString(labels, 'host_name') LIKE '%%-otel-agent%%'
		AND fingerprint GLOBAL IN (%s)`,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_V4_TABLENAME, namesStr, queryForRecentFingerprints)

	result, err := h.reader.GetListResultV3(ctx, query)
	if err != nil {
		return nil, nil, err
	}

	clusterNames := make(map[string]struct{})
	nodeNames := make(map[string]struct{})

	for _, row := range result {
		switch v := row.Data["k8s_cluster_name"].(type) {
		case string:
			clusterNames[v] = struct{}{}
		case *string:
			clusterNames[*v] = struct{}{}
		}
		switch v := row.Data["k8s_node_name"].(type) {
		case string:
			nodeNames[v] = struct{}{}
		case *string:
			nodeNames[*v] = struct{}{}
		}
	}

	return maps.Keys(clusterNames), maps.Keys(nodeNames), nil
}

func (h *HostsRepo) GetHostList(ctx context.Context, req model.HostListRequest) (model.HostListResponse, error) {
	resp := model.HostListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	// default to cpu order by
	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	// default to host name group by
	if len(req.GroupBy) == 0 {
		req.GroupBy = []v3.AttributeKey{{Key: hostNameAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	// don't fail the request if we can't get these values
	if clusterNames, nodeNames, err := h.IsSendingK8SAgentMetrics(ctx, req); err == nil {
		resp.IsSendingK8SAgentMetrics = len(clusterNames) > 0 || len(nodeNames) > 0
		resp.ClusterNames = clusterNames
		resp.NodeNames = nodeNames
	}
	if sentAnyHostMetricsData, err := h.DidSendHostMetricsData(ctx, req); err == nil {
		resp.SentAnyHostMetricsData = sentAnyHostMetricsData
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := HostsTableListQuery.Clone()

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

	hostAttrs, err := h.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	activeHosts, err := h.getActiveHosts(ctx, req)
	if err != nil {
		return resp, err
	}

	topHostGroups, allHostGroups, err := h.getTopHostGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topHostGroup := range topHostGroups {
		for k, v := range topHostGroup {
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

	queryResponse, _, err := h.querierV2.QueryRange(ctx, query)
	if err != nil {
		return resp, err
	}

	formattedResponse, err := postprocess.PostProcessResult(queryResponse, query)
	if err != nil {
		return resp, err
	}

	records := []model.HostListRecord{}

	for _, result := range formattedResponse {
		for _, row := range result.Table.Rows {
			record := model.HostListRecord{
				CPU:    -1,
				Memory: -1,
				Wait:   -1,
				Load15: -1,
			}

			if hostName, ok := row.Data[hostNameAttrKey].(string); ok {
				record.HostName = hostName
			}

			if cpu, ok := row.Data["F1"].(float64); ok {
				record.CPU = cpu
			}
			if memory, ok := row.Data["F2"].(float64); ok {
				record.Memory = memory
			}
			if wait, ok := row.Data["F3"].(float64); ok {
				record.Wait = wait
			}
			if load15, ok := row.Data["G"].(float64); ok {
				record.Load15 = load15
			}
			record.Meta = map[string]string{}
			if _, ok := hostAttrs[record.HostName]; ok {
				record.Meta = hostAttrs[record.HostName]
			}
			if osType, ok := record.Meta["os_type"]; ok {
				record.OS = osType
			}
			record.Active = activeHosts[record.HostName]
			records = append(records, record)
		}
	}
	resp.Total = len(allHostGroups)
	resp.Records = records
	resp.SortBy(req.OrderBy)

	return resp, nil
}
