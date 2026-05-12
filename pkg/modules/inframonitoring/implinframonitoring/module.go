package implinframonitoring

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/inframonitoring"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	querier                querier.Querier
	fieldMapper            qbtypes.FieldMapper
	condBuilder            qbtypes.ConditionBuilder
	logger                 *slog.Logger
	config                 inframonitoring.Config
}

// NewModule constructs the inframonitoring module with the provided dependencies.
func NewModule(
	telemetryStore telemetrystore.TelemetryStore,
	telemetryMetadataStore telemetrytypes.MetadataStore,
	querier querier.Querier,
	providerSettings factory.ProviderSettings,
	cfg inframonitoring.Config,
) inframonitoring.Module {
	fieldMapper := telemetrymetrics.NewFieldMapper()
	condBuilder := telemetrymetrics.NewConditionBuilder(fieldMapper)
	return &module{
		telemetryStore:         telemetryStore,
		telemetryMetadataStore: telemetryMetadataStore,
		querier:                querier,
		fieldMapper:            fieldMapper,
		condBuilder:            condBuilder,
		logger:                 providerSettings.Logger,
		config:                 cfg,
	}
}

func (m *module) ListHosts(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableHosts) (*inframonitoringtypes.Hosts, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Hosts{}

	// default to cpu order by
	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: "cpu",
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	// default to host name group by
	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{hostNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	// 1. Check which required metrics exist and get earliest retention time.
	// If any required metric is missing, return early with the list of missing metrics.
	// 2. If metrics exist but req.End is before the earliest reported time, return early with endTimeBeforeRetention=true.
	missingMetrics, minFirstReportedUnixMilli, err := m.getMetricsExistenceAndEarliestTime(ctx, hostsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if len(missingMetrics) > 0 {
		resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: missingMetrics}
		resp.Records = []inframonitoringtypes.HostRecord{}
		resp.Total = 0
		return resp, nil
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.HostRecord{}
		resp.Total = 0
		return resp, nil
	}
	resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: []string{}}

	// TOD(nikhilmantri0902): replace this separate ClickHouse query with a sub-query inside the main query builder query
	// once QB supports sub-queries.
	// Determine active hosts: those with metrics reported in the last 10 minutes.
	// Compute the cutoff once so every downstream query/subquery agrees on what "active" means.
	sinceUnixMilli := time.Now().Add(-10 * time.Minute).UTC().UnixMilli()
	activeHostsMap, err := m.getActiveHosts(ctx, hostsTableMetricNamesList, hostNameAttrKey, sinceUnixMilli)
	if err != nil {
		return nil, err
	}

	// this check below modifies req.Filter by adding `AND active hosts filter` if req.FilterByStatus is set.
	if m.applyHostsActiveStatusFilter(req, activeHostsMap) {
		resp.Records = []inframonitoringtypes.HostRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getHostsTableMetadata(ctx, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopHostGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.HostRecord{}
		return resp, nil
	}

	hostsFilterExpr := ""
	if req.Filter != nil {
		hostsFilterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, hostsFilterExpr, req.GroupBy, pageGroups, m.newListHostsQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	// Compute per-group active/inactive host counts.
	// When host.name is in groupBy, each row = one host, so counts are derived
	// directly from activeHostsMap in buildHostRecords (no extra query needed).
	// When host.name is not in groupBy, we need to run an additional query to get the counts per group for the current page,
	// using the same filter expression as the main query (including user filters + page groups IN clause).
	hostCounts := make(map[string]groupHostStatusCounts)
	isHostNameInGroupBy := isKeyInGroupByAttrs(req.GroupBy, hostNameAttrKey)
	if !isHostNameInGroupBy {
		hostCounts, err = m.getPerGroupHostStatusCounts(ctx, req, hostsTableMetricNamesList, pageGroups, sinceUnixMilli)
		if err != nil {
			return nil, err
		}
	}

	resp.Records = buildHostRecords(isHostNameInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, activeHostsMap, hostCounts)
	resp.Warning = queryResp.Warning

	return resp, nil
}

func (m *module) ListPods(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostablePods) (*inframonitoringtypes.Pods, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Pods{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.PodsOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{podUIDGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	missingMetrics, minFirstReportedUnixMilli, err := m.getMetricsExistenceAndEarliestTime(ctx, podsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if len(missingMetrics) > 0 {
		resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: missingMetrics}
		resp.Records = []inframonitoringtypes.PodRecord{}
		resp.Total = 0
		return resp, nil
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.PodRecord{}
		resp.Total = 0
		return resp, nil
	}
	resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: []string{}}

	metadataMap, err := m.getPodsTableMetadata(ctx, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopPodGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.PodRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newPodsTableListQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	phaseCounts, err := m.getPerGroupPodPhaseCounts(ctx, req, pageGroups)
	if err != nil {
		return nil, err
	}

	isPodUIDInGroupBy := isKeyInGroupByAttrs(req.GroupBy, podUIDAttrKey)
	resp.Records = buildPodRecords(isPodUIDInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, req.End)
	resp.Warning = queryResp.Warning

	return resp, nil
}

func (m *module) ListNodes(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNodes) (*inframonitoringtypes.Nodes, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Nodes{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.NodesOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{nodeNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	missingMetrics, minFirstReportedUnixMilli, err := m.getMetricsExistenceAndEarliestTime(ctx, nodesTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if len(missingMetrics) > 0 {
		resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: missingMetrics}
		resp.Records = []inframonitoringtypes.NodeRecord{}
		resp.Total = 0
		return resp, nil
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.NodeRecord{}
		resp.Total = 0
		return resp, nil
	}
	resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: []string{}}

	metadataMap, err := m.getNodesTableMetadata(ctx, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopNodeGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.NodeRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newNodesTableListQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	nodeConditionCounts, err := m.getPerGroupNodeConditionCounts(ctx, req, pageGroups)
	if err != nil {
		return nil, err
	}

	// Reuse the pods phase-counts CTE function via a temp struct — it reads only
	// Start/End/Filter/GroupBy from PostablePods.
	podPhaseCounts, err := m.getPerGroupPodPhaseCounts(ctx, &inframonitoringtypes.PostablePods{
		Start:   req.Start,
		End:     req.End,
		Filter:  req.Filter,
		GroupBy: req.GroupBy,
	}, pageGroups)
	if err != nil {
		return nil, err
	}

	isNodeNameInGroupBy := isKeyInGroupByAttrs(req.GroupBy, nodeNameAttrKey)
	resp.Records = buildNodeRecords(isNodeNameInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, nodeConditionCounts, podPhaseCounts)
	resp.Warning = queryResp.Warning

	return resp, nil
}

func (m *module) ListNamespaces(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNamespaces) (*inframonitoringtypes.Namespaces, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Namespaces{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.NamespacesOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{namespaceNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	missingMetrics, minFirstReportedUnixMilli, err := m.getMetricsExistenceAndEarliestTime(ctx, namespacesTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if len(missingMetrics) > 0 {
		resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: missingMetrics}
		resp.Records = []inframonitoringtypes.NamespaceRecord{}
		resp.Total = 0
		return resp, nil
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.NamespaceRecord{}
		resp.Total = 0
		return resp, nil
	}
	resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: []string{}}

	metadataMap, err := m.getNamespacesTableMetadata(ctx, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopNamespaceGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.NamespaceRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newNamespacesTableListQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	// Reuse the pods phase-counts CTE function via a temp struct — it reads only
	// Start/End/Filter/GroupBy from PostablePods.
	phaseCounts, err := m.getPerGroupPodPhaseCounts(ctx, &inframonitoringtypes.PostablePods{
		Start:   req.Start,
		End:     req.End,
		Filter:  req.Filter,
		GroupBy: req.GroupBy,
	}, pageGroups)
	if err != nil {
		return nil, err
	}

	resp.Records = buildNamespaceRecords(queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts)
	resp.Warning = queryResp.Warning

	return resp, nil
}

func (m *module) ListClusters(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableClusters) (*inframonitoringtypes.Clusters, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Clusters{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.ClustersOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	missingMetrics, minFirstReportedUnixMilli, err := m.getMetricsExistenceAndEarliestTime(ctx, clustersTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if len(missingMetrics) > 0 {
		resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: missingMetrics}
		resp.Records = []inframonitoringtypes.ClusterRecord{}
		resp.Total = 0
		return resp, nil
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.ClusterRecord{}
		resp.Total = 0
		return resp, nil
	}
	resp.RequiredMetricsCheck = inframonitoringtypes.RequiredMetricsCheck{MissingMetrics: []string{}}

	metadataMap, err := m.getClustersTableMetadata(ctx, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopClusterGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.ClusterRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newClustersTableListQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	// Reuse the nodes condition-counts CTE function via a temp struct — it reads only
	// Start/End/Filter/GroupBy from PostableNodes. With default groupBy
	// [k8s.cluster.name], counts are bucketed per cluster; with a custom groupBy,
	// they aggregate across clusters in that group.
	nodeConditionCountsMap, err := m.getPerGroupNodeConditionCounts(ctx, &inframonitoringtypes.PostableNodes{
		Start:   req.Start,
		End:     req.End,
		Filter:  req.Filter,
		GroupBy: req.GroupBy,
	}, pageGroups)
	if err != nil {
		return nil, err
	}

	// Same pattern for pod phase counts via PostablePods shim.
	podPhaseCountsMap, err := m.getPerGroupPodPhaseCounts(ctx, &inframonitoringtypes.PostablePods{
		Start:   req.Start,
		End:     req.End,
		Filter:  req.Filter,
		GroupBy: req.GroupBy,
	}, pageGroups)
	if err != nil {
		return nil, err
	}

	resp.Records = buildClusterRecords(queryResp, pageGroups, req.GroupBy, metadataMap, nodeConditionCountsMap, podPhaseCountsMap)
	resp.Warning = queryResp.Warning

	return resp, nil
}
