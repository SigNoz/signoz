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

func (m *module) HostsList(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.HostsListRequest) (*inframonitoringtypes.HostsListResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &inframonitoringtypes.HostsListResponse{}

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
	// 2. If metrics exist but req.End is before the earliest reported time, convey retention boundary.
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

	// TODO: replace this separate ClickHouse query with a sub-query inside the main query builder query
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
	if metadataMap == nil {
		metadataMap = make(map[string]map[string]string)
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

	fullQueryReq := buildFullQueryRequest(req.Start, req.End, hostsFilterExpr, req.GroupBy, pageGroups, m.newHostsTableListQuery())
	queryResp, err := m.querier.QueryRange(ctx, orgID, fullQueryReq)
	if err != nil {
		return nil, err
	}

	// Compute per-group active/inactive host counts.
	// When host.name is in groupBy, each row = one host, so counts are derived
	// directly from activeHostsMap in buildHostRecords (no extra query needed).
	hostCounts := make(map[string]groupHostCounts)
	isHostNameInGroupBy := isKeyInGroupByAttrs(req.GroupBy, hostNameAttrKey)
	if !isHostNameInGroupBy {
		hostCounts, err = m.getPerGroupActiveInactiveHostCounts(ctx, req, hostsTableMetricNamesList, pageGroups, sinceUnixMilli)
		if err != nil {
			return nil, err
		}
	}

	resp.Records = buildHostRecords(isHostNameInGroupBy, queryResp, pageGroups, req.GroupBy, metadataMap, activeHostsMap, hostCounts)
	resp.Warning = queryResp.Warning

	return resp, nil
}
