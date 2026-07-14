package implinframonitoring

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/inframonitoring"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	querier                querier.Querier
	fieldMapper            qbtypes.FieldMapper
	condBuilder            qbtypes.ConditionBuilder
	logger                 *slog.Logger
	config                 inframonitoring.Config
	fl                     flagger.Flagger
}

// NewModule constructs the inframonitoring module with the provided dependencies.
func NewModule(
	telemetryStore telemetrystore.TelemetryStore,
	telemetryMetadataStore telemetrytypes.MetadataStore,
	querier querier.Querier,
	fl flagger.Flagger,
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
		fl:                     fl,
	}
}

// GetChecks runs a per-type readiness check: for the requested
// infra-monitoring tab, reports which required metrics and attributes are
// present vs missing, grouped by the collector component that produces them.
// Ready is true iff every missing list is empty.
func (m *module) GetChecks(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableChecks) (*inframonitoringtypes.Checks, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	spec, err := getSpecForType(req.Type)
	if err != nil {
		return nil, err
	}

	allMetrics := spec.getAllMetrics()
	allAttrs := spec.getAllAttrs()

	presentMetrics, err := m.getMetricsExistence(ctx, allMetrics)
	if err != nil {
		return nil, err
	}
	missingMetricsMap := make(map[string]bool, len(allMetrics))
	for _, name := range allMetrics {
		if !presentMetrics[name] {
			missingMetricsMap[name] = true
		}
	}

	presentAttrs, err := m.getAttributesExistence(ctx, allMetrics, allAttrs)
	if err != nil {
		return nil, err
	}
	missingAttrsMap := make(map[string]bool, len(allAttrs))
	for _, name := range allAttrs {
		if !presentAttrs[name] {
			missingAttrsMap[name] = true
		}
	}

	resp := &inframonitoringtypes.Checks{
		Type:                         req.Type,
		PresentDefaultEnabledMetrics: []inframonitoringtypes.MetricsComponentEntry{},
		PresentOptionalMetrics:       []inframonitoringtypes.MetricsComponentEntry{},
		PresentRequiredAttributes:    []inframonitoringtypes.AttributesComponentEntry{},
		MissingDefaultEnabledMetrics: []inframonitoringtypes.MissingMetricsComponentEntry{},
		MissingOptionalMetrics:       []inframonitoringtypes.MissingMetricsComponentEntry{},
		MissingRequiredAttributes:    []inframonitoringtypes.MissingAttributesComponentEntry{},
	}

	for _, b := range spec.Buckets {
		s := splitBucket(b, missingMetricsMap, missingAttrsMap)
		if s.PresentDefault != nil {
			resp.PresentDefaultEnabledMetrics = append(resp.PresentDefaultEnabledMetrics, *s.PresentDefault)
		}
		if s.PresentOptional != nil {
			resp.PresentOptionalMetrics = append(resp.PresentOptionalMetrics, *s.PresentOptional)
		}
		if s.PresentAttrs != nil {
			resp.PresentRequiredAttributes = append(resp.PresentRequiredAttributes, *s.PresentAttrs)
		}
		if s.MissingDefault != nil {
			resp.MissingDefaultEnabledMetrics = append(resp.MissingDefaultEnabledMetrics, *s.MissingDefault)
		}
		if s.MissingOptional != nil {
			resp.MissingOptionalMetrics = append(resp.MissingOptionalMetrics, *s.MissingOptional)
		}
		if s.MissingAttrs != nil {
			resp.MissingRequiredAttributes = append(resp.MissingRequiredAttributes, *s.MissingAttrs)
		}
	}

	resp.Ready = len(resp.MissingDefaultEnabledMetrics) == 0 &&
		len(resp.MissingOptionalMetrics) == 0 &&
		len(resp.MissingRequiredAttributes) == 0

	return resp, nil
}

func (m *module) ListHosts(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableHosts) (*inframonitoringtypes.Hosts, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListHosts")

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

	// If req.End is before the earliest reported time for these metrics, return early
	// with endTimeBeforeRetention=true.
	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, hostsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.HostRecord{}
		resp.Total = 0
		return resp, nil
	}

	// TOD(nikhilmantri0902): replace this separate ClickHouse query with a sub-query inside the main query builder query
	// once QB supports sub-queries.
	// Determine active hosts: those with metrics reported in the last 10 minutes.
	// Compute the cutoff once so every downstream query/subquery agrees on what "active" means.
	sinceUnixMilli := time.Now().Add(-10 * time.Minute).UTC().UnixMilli()
	activeHostsMap, err := m.getActiveHosts(ctx, hostsTableMetricNamesList, inframonitoringtypes.HostNameAttrKey, sinceUnixMilli)
	if err != nil {
		return nil, err
	}

	// this check below modifies req.Filter by adding `AND active hosts filter` if req.FilterByStatus is set.
	if m.applyHostsActiveStatusFilter(req, activeHostsMap) {
		resp.Records = []inframonitoringtypes.HostRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getHostsTableMetadata(ctx, orgID, req)
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

	// Compute per-group active/inactive host counts.
	// When host.name is in groupBy, each row = one host, so counts are derived
	// directly from activeHostsMap in buildHostRecords (no extra query needed).
	// When host.name is not in groupBy, we need to run an additional query to get the counts per group for the current page,
	// using the same filter expression as the main query (including user filters + page groups IN clause).
	isHostNameInGroupBy := isKeyInGroupByAttrs(req.GroupBy, inframonitoringtypes.HostNameAttrKey)

	var (
		queryResp  *qbtypes.QueryRangeResponse
		hostCounts = make(map[string]groupHostStatusCounts)
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})

	if !isHostNameInGroupBy {
		g.Go(func() error {
			var err error
			hostCounts, err = m.getPerGroupHostStatusCounts(gCtx, orgID, req, hostsTableMetricNamesList, pageGroups, sinceUnixMilli)
			return err
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildHostRecords(isHostNameInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, activeHostsMap, hostCounts)
	resp.Warning = queryResp.Warning

	return resp, nil
}

func (m *module) ListPods(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostablePods) (*inframonitoringtypes.Pods, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListPods")

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

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, podsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.PodRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getPodsTableMetadata(ctx, orgID, req)
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

	var (
		queryResp     *qbtypes.QueryRangeResponse
		phaseCounts   map[string]podPhaseCounts
		statusCounts  map[string]podStatusCounts
		statusWarning *qbtypes.QueryWarnData
		restartCounts map[string]int64
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		phaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		statusCounts, statusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		restartCounts, err = m.getPerGroupPodRestartCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	isPodUIDInGroupBy := isKeyInGroupByAttrs(req.GroupBy, podUIDAttrKey)
	resp.Records = buildPodRecords(isPodUIDInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, statusCounts, restartCounts, req.End)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, statusWarning)

	return resp, nil
}

func (m *module) ListContainers(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableContainers) (*inframonitoringtypes.Containers, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListContainers")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Containers{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.ContainersOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = containerRowGroupBy
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, containersTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.ContainerRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getContainersTableMetadata(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopContainerGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.ContainerRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newContainersTableListQuery())

	var (
		queryResp     *qbtypes.QueryRangeResponse
		statusCounts  map[string]containerStatusCounts
		statusWarning *qbtypes.QueryWarnData
		restartCounts map[string]int64
		readyCounts   map[string]containerReadyCounts
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		statusCounts, statusWarning, err = m.getPerGroupContainerStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		restartCounts, err = m.getPerGroupContainerRestartCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		readyCounts, err = m.getPerGroupContainerReadyCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	isContainerNameAndPodUIDInGroupBy := isKeyInGroupByAttrs(req.GroupBy, containerNameAttrKey) && isKeyInGroupByAttrs(req.GroupBy, podUIDAttrKey)
	resp.Records = buildContainerRecords(isContainerNameAndPodUIDInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, statusCounts, restartCounts, readyCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, statusWarning)

	return resp, nil
}

func (m *module) ListNodes(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNodes) (*inframonitoringtypes.Nodes, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListNodes")

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

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, nodesTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.NodeRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getNodesTableMetadata(ctx, orgID, req)
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

	var (
		queryResp           *qbtypes.QueryRangeResponse
		nodeConditionCounts map[string]nodeConditionCounts
		podPhaseCounts      map[string]podPhaseCounts
		podStatusCounts     map[string]podStatusCounts
		podStatusWarning    *qbtypes.QueryWarnData
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		nodeConditionCounts, err = m.getPerGroupNodeConditionCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podPhaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	isNodeNameInGroupBy := isKeyInGroupByAttrs(req.GroupBy, inframonitoringtypes.NodeNameAttrKey)
	resp.Records = buildNodeRecords(isNodeNameInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, nodeConditionCounts, podPhaseCounts, podStatusCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) ListNamespaces(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNamespaces) (*inframonitoringtypes.Namespaces, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListNamespaces")

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
		req.GroupBy = []qbtypes.GroupByKey{namespaceNameGroupByKey, clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, namespacesTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.NamespaceRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getNamespacesTableMetadata(ctx, orgID, req)
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

	var (
		queryResp        *qbtypes.QueryRangeResponse
		phaseCounts      map[string]podPhaseCounts
		podStatusCounts  map[string]podStatusCounts
		podStatusWarning *qbtypes.QueryWarnData
		resourceCounts   map[string]map[string]int64
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		phaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		resourceCounts, err = m.getPerGroupDistinctCounts(gCtx, orgID, req.Start, req.End, req.Filter, req.GroupBy, pageGroups, namespaceCountAttrKeys, namespacesTableMetricNamesList)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildNamespaceRecords(queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, podStatusCounts, resourceCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) ListClusters(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableClusters) (*inframonitoringtypes.Clusters, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListClusters")

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

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, clustersTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.ClusterRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getClustersTableMetadata(ctx, orgID, req)
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

	// With default groupBy [k8s.cluster.name], counts are bucketed per cluster;
	// with a custom groupBy, they aggregate across clusters in that group.
	var (
		queryResp              *qbtypes.QueryRangeResponse
		nodeConditionCountsMap map[string]nodeConditionCounts
		podPhaseCountsMap      map[string]podPhaseCounts
		podStatusCounts        map[string]podStatusCounts
		podStatusWarning       *qbtypes.QueryWarnData
		resourceCounts         map[string]map[string]int64
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		nodeConditionCountsMap, err = m.getPerGroupNodeConditionCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podPhaseCountsMap, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		resourceCounts, err = m.getPerGroupDistinctCounts(gCtx, orgID, req.Start, req.End, req.Filter, req.GroupBy, pageGroups, clusterCountAttrKeys, clusterMetricNamesListForCounts)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildClusterRecords(queryResp, pageGroups, req.GroupBy, metadataMap, nodeConditionCountsMap, podPhaseCountsMap, podStatusCounts, resourceCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) ListVolumes(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableVolumes) (*inframonitoringtypes.Volumes, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListVolumes")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Volumes{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.VolumesOrderByUsage,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{pvcNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	// Bake the volume base filter into req.Filter so all downstream helpers pick it up.
	if req.Filter == nil {
		req.Filter = &qbtypes.Filter{}
	}
	req.Filter.Expression = mergeFilterExpressions(volumesBaseFilterExpr, req.Filter.Expression)

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, volumesTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.VolumeRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getVolumesTableMetadata(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopVolumeGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.VolumeRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newVolumesTableListQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	resp.Records = buildVolumeRecords(queryResp, pageGroups, req.GroupBy, metadataMap)
	resp.Warning = queryResp.Warning

	return resp, nil
}

func (m *module) ListDeployments(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableDeployments) (*inframonitoringtypes.Deployments, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListDeployments")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Deployments{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.DeploymentsOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{deploymentNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	// Bake the deployments base filter into req.Filter so all downstream helpers pick it up.
	if req.Filter == nil {
		req.Filter = &qbtypes.Filter{}
	}
	req.Filter.Expression = mergeFilterExpressions(deploymentsBaseFilterExpr, req.Filter.Expression)

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, deploymentsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.DeploymentRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getDeploymentsTableMetadata(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopDeploymentGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.DeploymentRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newDeploymentsTableListQuery())

	var (
		queryResp        *qbtypes.QueryRangeResponse
		phaseCounts      map[string]podPhaseCounts
		podStatusCounts  map[string]podStatusCounts
		podStatusWarning *qbtypes.QueryWarnData
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		phaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildDeploymentRecords(queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, podStatusCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) ListStatefulSets(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableStatefulSets) (*inframonitoringtypes.StatefulSets, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListStatefulSets")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.StatefulSets{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.StatefulSetsOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{statefulSetNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	// Bake the workload base filter into req.Filter so all downstream helpers pick it up.
	if req.Filter == nil {
		req.Filter = &qbtypes.Filter{}
	}
	req.Filter.Expression = mergeFilterExpressions(statefulSetsBaseFilterExpr, req.Filter.Expression)

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, statefulSetsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.StatefulSetRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getStatefulSetsTableMetadata(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopStatefulSetGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.StatefulSetRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newStatefulSetsTableListQuery())

	// Pods owned by a StatefulSet carry k8s.statefulset.name as a resource attribute,
	// so default-groupBy gives per-statefulset phase counts automatically.
	var (
		queryResp        *qbtypes.QueryRangeResponse
		phaseCounts      map[string]podPhaseCounts
		podStatusCounts  map[string]podStatusCounts
		podStatusWarning *qbtypes.QueryWarnData
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		phaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildStatefulSetRecords(queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, podStatusCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) ListJobs(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableJobs) (*inframonitoringtypes.Jobs, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListJobs")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.Jobs{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.JobsOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{jobNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	// Bake the jobs base filter into req.Filter so all downstream helpers pick it up.
	if req.Filter == nil {
		req.Filter = &qbtypes.Filter{}
	}
	req.Filter.Expression = mergeFilterExpressions(jobsBaseFilterExpr, req.Filter.Expression)

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, jobsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.JobRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getJobsTableMetadata(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopJobGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.JobRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newJobsTableListQuery())

	// Pods owned by a Job carry k8s.job.name as a resource attribute, so default-groupBy
	// gives per-job phase counts automatically.
	var (
		queryResp        *qbtypes.QueryRangeResponse
		phaseCounts      map[string]podPhaseCounts
		podStatusCounts  map[string]podStatusCounts
		podStatusWarning *qbtypes.QueryWarnData
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		phaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildJobRecords(queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, podStatusCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) ListDaemonSets(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableDaemonSets) (*inframonitoringtypes.DaemonSets, error) {
	ctx = m.withInfraMonitoringContext(ctx, "ListDaemonSets")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.DaemonSets{}

	if req.OrderBy == nil {
		req.OrderBy = &qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: inframonitoringtypes.DaemonSetsOrderByCPU,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		}
	}

	if len(req.GroupBy) == 0 {
		req.GroupBy = []qbtypes.GroupByKey{daemonSetNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey}
		resp.Type = inframonitoringtypes.ResponseTypeList
	} else {
		resp.Type = inframonitoringtypes.ResponseTypeGroupedList
	}

	// Bake the workload base filter into req.Filter so all downstream helpers pick it up.
	if req.Filter == nil {
		req.Filter = &qbtypes.Filter{}
	}
	req.Filter.Expression = mergeFilterExpressions(daemonSetsBaseFilterExpr, req.Filter.Expression)

	minFirstReportedUnixMilli, err := m.getEarliestMetricTime(ctx, daemonSetsTableMetricNamesList)
	if err != nil {
		return nil, err
	}
	if req.End < int64(minFirstReportedUnixMilli) {
		resp.EndTimeBeforeRetention = true
		resp.Records = []inframonitoringtypes.DaemonSetRecord{}
		resp.Total = 0
		return resp, nil
	}

	metadataMap, err := m.getDaemonSetsTableMetadata(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	resp.Total = len(metadataMap)

	pageGroups, err := m.getTopDaemonSetGroups(ctx, orgID, req, metadataMap)
	if err != nil {
		return nil, err
	}

	if len(pageGroups) == 0 {
		resp.Records = []inframonitoringtypes.DaemonSetRecord{}
		return resp, nil
	}

	filterExpr := ""
	if req.Filter != nil {
		filterExpr = req.Filter.Expression
	}

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, filterExpr, req.GroupBy, pageGroups, m.newDaemonSetsTableListQuery())

	// Pods owned by a DaemonSet carry k8s.daemonset.name as a resource attribute,
	// so default-groupBy gives per-daemonset phase counts automatically.
	var (
		queryResp        *qbtypes.QueryRangeResponse
		phaseCounts      map[string]podPhaseCounts
		podStatusCounts  map[string]podStatusCounts
		podStatusWarning *qbtypes.QueryWarnData
	)

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		queryResp, err = m.querier.QueryRange(gCtx, orgID, fullQueryReq)
		return err
	})
	g.Go(func() error {
		var err error
		phaseCounts, err = m.getPerGroupPodPhaseCounts(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})
	g.Go(func() error {
		var err error
		podStatusCounts, podStatusWarning, err = m.getPerGroupPodStatusCountsWithReqMetricChecks(gCtx, req.Start, req.End, req.Filter, req.GroupBy, pageGroups)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	resp.Records = buildDaemonSetRecords(queryResp, pageGroups, req.GroupBy, metadataMap, phaseCounts, podStatusCounts)
	resp.Warning = mergeQueryWarnings(queryResp.Warning, podStatusWarning)

	return resp, nil
}

func (m *module) withInfraMonitoringContext(ctx context.Context, functionName string) context.Context {
	comments := map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "infra-monitoring",
		instrumentationtypes.CodeFunctionName: functionName,
	}
	return ctxtypes.NewContextWithCommentVals(ctx, comments)
}
