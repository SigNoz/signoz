package inframetrics

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"golang.org/x/exp/slices"
)

var (
	metricToUseForPods = "k8s_pod_cpu_utilization"

	podAttrsToEnrich = []string{
		"k8s_pod_uid",
		"k8s_pod_name",
		"k8s_namespace_name",
		"k8s_node_name",
		"k8s_deployment_name",
		"k8s_statefulset_name",
		"k8s_daemonset_name",
		"k8s_job_name",
		"k8s_cronjob_name",
		"k8s_cluster_name",
	}

	k8sPodUIDAttrKey = "k8s_pod_uid"

	queryNamesForPods = map[string][]string{
		"cpu":            {"A"},
		"cpu_request":    {"B", "A"},
		"cpu_limit":      {"C", "A"},
		"memory":         {"D"},
		"memory_request": {"E", "D"},
		"memory_limit":   {"F", "D"},
		"restarts":       {"G", "A"},
		"pod_phase":      {"H", "I", "J", "K"},
	}
	podQueryNames = []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"}

	metricNamesForPods = map[string]string{
		"cpu":            "k8s_pod_cpu_utilization",
		"cpu_request":    "k8s_pod_cpu_request_utilization",
		"cpu_limit":      "k8s_pod_cpu_limit_utilization",
		"memory":         "k8s_pod_memory_usage",
		"memory_request": "k8s_pod_memory_request_utilization",
		"memory_limit":   "k8s_pod_memory_limit_utilization",
		"restarts":       "k8s_container_restarts",
		"pod_phase":      "k8s_pod_phase",
	}
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

func (p *PodsRepo) DidSendPodMetrics(ctx context.Context) (bool, error) {
	namesStr := "'" + strings.Join(podMetricNamesToCheck, "','") + "'"

	query := fmt.Sprintf(didSendPodMetricsQuery,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME, namesStr)

	count, err := p.reader.GetCountOfThings(ctx, query)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (p *PodsRepo) DidSendClusterMetrics(ctx context.Context) (bool, error) {
	namesStr := "'" + strings.Join(clusterMetricNamesToCheck, "','") + "'"

	query := fmt.Sprintf(didSendClusterMetricsQuery,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME, namesStr)

	count, err := p.reader.GetCountOfThings(ctx, query)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (p *PodsRepo) IsSendingOptionalPodMetrics(ctx context.Context) (bool, error) {
	namesStr := "'" + strings.Join(optionalPodMetricNamesToCheck, "','") + "'"

	query := fmt.Sprintf(isSendingOptionalPodMetricsQuery,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME, namesStr)

	count, err := p.reader.GetCountOfThings(ctx, query)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (p *PodsRepo) SendingRequiredMetadata(ctx context.Context) ([]model.PodOnboardingStatus, error) {
	namesStr := "'" + strings.Join(podMetricNamesToCheck, "','") + "'"

	query := fmt.Sprintf(isSendingRequiredMetadataQuery,
		constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_V4_TABLENAME, namesStr)

	result, err := p.reader.GetListResultV3(ctx, query)
	if err != nil {
		return nil, err
	}

	statuses := []model.PodOnboardingStatus{}

	// for each pod, check if we have all the required metadata
	for _, row := range result {
		status := model.PodOnboardingStatus{}
		switch v := row.Data["k8s_cluster_name"].(type) {
		case string:
			status.HasClusterName = true
			status.ClusterName = v
		case *string:
			status.HasClusterName = *v != ""
			status.ClusterName = *v
		}
		switch v := row.Data["k8s_node_name"].(type) {
		case string:
			status.HasNodeName = true
			status.NodeName = v
		case *string:
			status.HasNodeName = *v != ""
			status.NodeName = *v
		}
		switch v := row.Data["k8s_namespace_name"].(type) {
		case string:
			status.HasNamespaceName = true
			status.NamespaceName = v
		case *string:
			status.HasNamespaceName = *v != ""
			status.NamespaceName = *v
		}
		switch v := row.Data["k8s_deployment_name"].(type) {
		case string:
			status.HasDeploymentName = true
		case *string:
			status.HasDeploymentName = *v != ""
		}
		switch v := row.Data["k8s_statefulset_name"].(type) {
		case string:
			status.HasStatefulsetName = true
		case *string:
			status.HasStatefulsetName = *v != ""
		}
		switch v := row.Data["k8s_daemonset_name"].(type) {
		case string:
			status.HasDaemonsetName = true
		case *string:
			status.HasDaemonsetName = *v != ""
		}
		switch v := row.Data["k8s_cronjob_name"].(type) {
		case string:
			status.HasCronjobName = true
		case *string:
			status.HasCronjobName = *v != ""
		}
		switch v := row.Data["k8s_job_name"].(type) {
		case string:
			status.HasJobName = true
		case *string:
			status.HasJobName = *v != ""
		}

		switch v := row.Data["k8s_pod_name"].(type) {
		case string:
			status.PodName = v
		case *string:
			status.PodName = *v
		}

		if !status.HasClusterName ||
			!status.HasNodeName ||
			!status.HasNamespaceName ||
			(!status.HasDeploymentName && !status.HasStatefulsetName && !status.HasDaemonsetName && !status.HasCronjobName && !status.HasJobName) {
			statuses = append(statuses, status)
		}
	}

	return statuses, nil
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

		podName := stringData[k8sPodUIDAttrKey]
		if _, ok := podAttrs[podName]; !ok {
			podAttrs[podName] = map[string]string{}
		}

		for _, key := range req.GroupBy {
			podAttrs[podName][key.Key] = stringData[key.Key]
		}
	}

	return podAttrs, nil
}

func (p *PodsRepo) getTopPodGroups(ctx context.Context, req model.PodListRequest, q *v3.QueryRangeParamsV3) ([]map[string]string, []map[string]string, error) {
	step, timeSeriesTableName, samplesTableName := getParamsForTopPods(req)

	queryNames := queryNamesForPods[req.OrderBy.ColumnName]
	topPodGroupsQueryRangeParams := &v3.QueryRangeParamsV3{
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
		topPodGroupsQueryRangeParams.CompositeQuery.BuilderQueries[queryName] = query
	}

	queryResponse, _, err := p.querierV2.QueryRange(ctx, topPodGroupsQueryRangeParams)
	if err != nil {
		return nil, nil, err
	}
	formattedResponse, err := postprocess.PostProcessResult(queryResponse, topPodGroupsQueryRangeParams)
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

	paginatedTopPodGroupsSeries := formattedResponse[0].Series[req.Offset:int(limit)]

	topPodGroups := []map[string]string{}
	for _, series := range paginatedTopPodGroupsSeries {
		topPodGroups = append(topPodGroups, series.Labels)
	}
	allPodGroups := []map[string]string{}
	for _, series := range formattedResponse[0].Series {
		allPodGroups = append(allPodGroups, series.Labels)
	}

	return topPodGroups, allPodGroups, nil
}

func (p *PodsRepo) GetPodList(ctx context.Context, req model.PodListRequest) (model.PodListResponse, error) {
	resp := model.PodListResponse{}

	if req.Limit == 0 {
		req.Limit = 10
	}

	if req.OrderBy == nil {
		req.OrderBy = &v3.OrderBy{ColumnName: "cpu", Order: v3.DirectionDesc}
	}

	if req.GroupBy == nil {
		req.GroupBy = []v3.AttributeKey{{Key: k8sPodUIDAttrKey}}
		resp.Type = model.ResponseTypeList
	} else {
		resp.Type = model.ResponseTypeGroupedList
	}

	step := int64(math.Max(float64(common.MinAllowedStepInterval(req.Start, req.End)), 60))

	query := PodsTableListQuery.Clone()

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
		query.GroupBy = req.GroupBy
	}

	podAttrs, err := p.getMetadataAttributes(ctx, req)
	if err != nil {
		return resp, err
	}

	topPodGroups, allPodGroups, err := p.getTopPodGroups(ctx, req, query)
	if err != nil {
		return resp, err
	}

	groupFilters := map[string][]string{}
	for _, topPodGroup := range topPodGroups {
		for k, v := range topPodGroup {
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
				RestartCount:     -1,
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

			if restarts, ok := row.Data["G"].(float64); ok {
				record.RestartCount = int(restarts)
			}

			if pending, ok := row.Data["H"].(float64); ok {
				record.CountByPhase.Pending = int(pending)
			}

			if running, ok := row.Data["I"].(float64); ok {
				record.CountByPhase.Running = int(running)
			}

			if succeeded, ok := row.Data["J"].(float64); ok {
				record.CountByPhase.Succeeded = int(succeeded)
			}

			if failed, ok := row.Data["K"].(float64); ok {
				record.CountByPhase.Failed = int(failed)
			}

			record.Meta = map[string]string{}
			if _, ok := podAttrs[record.PodUID]; ok && record.PodUID != "" {
				record.Meta = podAttrs[record.PodUID]
			}

			for k, v := range row.Data {
				if slices.Contains(podQueryNames, k) {
					continue
				}
				if labelValue, ok := v.(string); ok {
					record.Meta[k] = labelValue
				}
			}

			records = append(records, record)
		}
	}
	resp.Total = len(allPodGroups)
	resp.Records = records

	resp.SortBy(req.OrderBy)

	return resp, nil
}
