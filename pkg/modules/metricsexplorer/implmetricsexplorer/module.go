package implmetricsexplorer

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	sqlbuilder "github.com/huandu/go-sqlbuilder"
	"golang.org/x/sync/errgroup"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	fieldMapper            qbtypes.FieldMapper
	condBuilder            qbtypes.ConditionBuilder
	logger                 *slog.Logger
	cache                  cache.Cache
	ruleStore              ruletypes.RuleStore
	dashboardModule        dashboard.Module
	fl                     flagger.Flagger
	config                 metricsexplorer.Config
}

// NewModule constructs the metrics module with the provided dependencies.
func NewModule(ts telemetrystore.TelemetryStore, telemetryMetadataStore telemetrytypes.MetadataStore, cache cache.Cache, ruleStore ruletypes.RuleStore, dashboardModule dashboard.Module, fl flagger.Flagger, providerSettings factory.ProviderSettings, cfg metricsexplorer.Config) metricsexplorer.Module {
	fieldMapper := telemetrymetrics.NewFieldMapper()
	condBuilder := telemetrymetrics.NewConditionBuilder(fieldMapper)
	return &module{
		telemetryStore:         ts,
		fieldMapper:            fieldMapper,
		condBuilder:            condBuilder,
		logger:                 providerSettings.Logger,
		telemetryMetadataStore: telemetryMetadataStore,
		cache:                  cache,
		ruleStore:              ruleStore,
		dashboardModule:        dashboardModule,
		fl:                     fl,
		config:                 cfg,
	}
}

// TODO(srikanthccv): use metadata store to fetch metric metadata.
func (m *module) ListMetrics(ctx context.Context, orgID valuer.UUID, params *metricsexplorertypes.ListMetricsParams) (*metricsexplorertypes.ListMetricsResponse, error) {
	ctx = m.withMetricsExplorerContext(ctx, "ListMetrics")

	if err := params.Validate(); err != nil {
		return nil, err
	}

	if params.Source == "meter" {
		return m.listMeterMetrics(ctx, params)
	}
	return m.listMetrics(ctx, orgID, params)
}

func (m *module) listMeterMetrics(ctx context.Context, params *metricsexplorertypes.ListMetricsParams) (*metricsexplorertypes.ListMetricsResponse, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"metric_name",
		"any(description) AS description",
		"any(type) AS metric_type",
		"any(unit) AS metric_unit",
		"argMax(temporality, unix_milli) AS temporality",
		"any(is_monotonic) AS is_monotonic",
	)
	sb.From(fmt.Sprintf("%s.%s", telemetrymeter.DBName, telemetrymeter.SamplesTableName))

	if params.Start != nil && params.End != nil {
		sb.Where(sb.Between("unix_milli", *params.Start, *params.End))
	}

	if params.Search != "" {
		searchLower := strings.ToLower(params.Search)
		searchLower = strings.ReplaceAll(searchLower, "%", "\\%")
		searchLower = strings.ReplaceAll(searchLower, "_", "\\_")
		sb.Where(sb.Like("lower(metric_name)", fmt.Sprintf("%%%s%%", searchLower)))
	}

	sb.GroupBy("metric_name")
	sb.OrderBy("metric_name ASC")
	sb.Limit(params.Limit)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list meter metrics")
	}
	defer rows.Close()

	metrics := make([]metricsexplorertypes.ListMetric, 0)
	for rows.Next() {
		var metric metricsexplorertypes.ListMetric
		if err := rows.Scan(
			&metric.MetricName,
			&metric.Description,
			&metric.MetricType,
			&metric.MetricUnit,
			&metric.Temporality,
			&metric.IsMonotonic,
		); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan meter metric")
		}
		metrics = append(metrics, metric)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating meter metrics")
	}

	return &metricsexplorertypes.ListMetricsResponse{
		Metrics: metrics,
	}, nil
}

func (m *module) listMetrics(ctx context.Context, orgID valuer.UUID, params *metricsexplorertypes.ListMetricsParams) (*metricsexplorertypes.ListMetricsResponse, error) {
	reductionEnabled := m.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID))

	applyListFilters := func(b *sqlbuilder.SelectBuilder) {
		if params.Search != "" {
			searchLower := strings.ToLower(params.Search)
			searchLower = strings.ReplaceAll(searchLower, "%", "\\%")
			searchLower = strings.ReplaceAll(searchLower, "_", "\\_")
			b.Where(b.Like("lower(metric_name)", fmt.Sprintf("%%%s%%", searchLower)))
		}
	}

	rawSB := sqlbuilder.NewSelectBuilder()
	rawSB.Select("DISTINCT metric_name")

	var rangeStart, rangeEnd uint64
	hasRange := params.Start != nil && params.End != nil
	if hasRange {
		var distributedTsTable string
		rangeStart, rangeEnd, distributedTsTable, _ = telemetrymetrics.WhichTSTableToUse(uint64(*params.Start), uint64(*params.End), false, nil)
		rawSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
		rawSB.Where(rawSB.Between("unix_milli", rangeStart, rangeEnd))
	} else {
		rawSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV41weekTableName))
	}

	applyListFilters(rawSB)

	var query string
	var args []any
	if reductionEnabled {
		reducedSB := sqlbuilder.NewSelectBuilder()
		reducedSB.Select("DISTINCT metric_name")
		reducedSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedTableName))
		if hasRange {
			reducedSB.Where(reducedSB.Between("unix_milli", rangeStart, rangeEnd))
		}
		applyListFilters(reducedSB)

		sb := sqlbuilder.NewSelectBuilder()
		sb.Select("DISTINCT metric_name")
		sb.From(sb.BuilderAs(sqlbuilder.UnionAll(rawSB, reducedSB), "__all_metrics"))
		sb.OrderBy("metric_name ASC")
		sb.Limit(params.Limit)
		query, args = sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	} else {
		rawSB.OrderBy("metric_name ASC")
		rawSB.Limit(params.Limit)
		query, args = rawSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	}

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list metrics")
	}
	defer rows.Close()

	metricNames := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan metric name")
		}
		metricNames = append(metricNames, name)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating metric names")
	}

	if len(metricNames) == 0 {
		return &metricsexplorertypes.ListMetricsResponse{
			Metrics: []metricsexplorertypes.ListMetric{},
		}, nil
	}

	metadata, err := m.GetMetricMetadataMulti(ctx, orgID, metricNames)
	if err != nil {
		return nil, err
	}

	metrics := make([]metricsexplorertypes.ListMetric, 0, len(metricNames))
	for _, name := range metricNames {
		metric := metricsexplorertypes.ListMetric{
			MetricName: name,
		}
		if meta, ok := metadata[name]; ok && meta != nil {
			metric.Description = meta.Description
			metric.MetricType = meta.MetricType
			metric.MetricUnit = meta.MetricUnit
			metric.Temporality = meta.Temporality
			metric.IsMonotonic = meta.IsMonotonic
		}
		metrics = append(metrics, metric)
	}

	return &metricsexplorertypes.ListMetricsResponse{
		Metrics: metrics,
	}, nil
}

func (m *module) GetStats(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.StatsRequest) (*metricsexplorertypes.StatsResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	metricStats, total, err := m.fetchMetricsStatsWithSamples(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	if len(metricStats) == 0 {
		return &metricsexplorertypes.StatsResponse{
			Metrics: []metricsexplorertypes.Stat{},
			Total:   0,
		}, nil
	}

	// Get metadata for all metrics
	metricNames := make([]string, len(metricStats))
	for i := range metricStats {
		metricNames[i] = metricStats[i].MetricName
	}

	metadata, err := m.GetMetricMetadataMulti(ctx, orgID, metricNames)
	if err != nil {
		return nil, err
	}

	// Enrich stats with metadata
	enrichStatsWithMetadata(metricStats, metadata)

	return &metricsexplorertypes.StatsResponse{
		Metrics: metricStats,
		Total:   total,
	}, nil
}

func (m *module) GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.TreemapRequest) (*metricsexplorertypes.TreemapResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	resp := &metricsexplorertypes.TreemapResponse{}
	switch req.Mode {
	case metricsexplorertypes.TreemapModeSamples:
		entries, err := m.computeSamplesTreemap(ctx, orgID, req)
		if err != nil {
			return nil, err
		}
		resp.Samples = entries
	default: // TreemapModeTimeSeries
		entries, err := m.computeTimeseriesTreemap(ctx, orgID, req)
		if err != nil {
			return nil, err
		}
		resp.TimeSeries = entries
	}

	return resp, nil
}

func (m *module) GetMetricMetadataMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsexplorertypes.MetricMetadata, error) {

	if len(metricNames) == 0 {
		return map[string]*metricsexplorertypes.MetricMetadata{}, nil
	}

	metadata := make(map[string]*metricsexplorertypes.MetricMetadata)
	cacheHits, cacheMisses := m.fetchMetadataFromCache(ctx, orgID, metricNames)
	for name, meta := range cacheHits {
		metadata[name] = meta
	}

	if len(cacheMisses) == 0 {
		return metadata, nil
	}

	updatedMetadata, err := m.fetchUpdatedMetadata(ctx, orgID, cacheMisses)
	if err != nil {
		return nil, err
	}
	for name, meta := range updatedMetadata {
		metadata[name] = meta
	}

	remainingMisses := extractMissingMetricNamesInMap(cacheMisses, updatedMetadata)
	if len(remainingMisses) == 0 {
		return metadata, nil
	}

	timeseriesMetadata, err := m.fetchTimeseriesMetadata(ctx, orgID, remainingMisses)
	if err != nil {
		return nil, err
	}
	for name, meta := range timeseriesMetadata {
		metadata[name] = meta
	}

	return metadata, nil
}

func (m *module) UpdateMetricMetadata(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.UpdateMetricMetadataRequest) error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric name is required")
	}

	// Validate and normalize metric type and temporality
	if err := m.validateAndNormalizeMetricType(req); err != nil {
		return err
	}

	// Validate labels for histogram and summary types
	if err := m.validateMetricLabels(ctx, req); err != nil {
		return err
	}

	// Insert new metadata (keeping history of all updates)
	if err := m.insertMetricsMetadata(ctx, orgID, req); err != nil {
		return err
	}

	return nil
}

func (m *module) GetMetricAlerts(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricAlertsResponse, error) {
	if metricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	ruleAlerts, err := m.ruleStore.GetStoredRulesByMetricName(ctx, orgID.String(), metricName)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get stored rules by metric name")
	}

	alerts := make([]metricsexplorertypes.MetricAlert, len(ruleAlerts))
	for i, ruleAlert := range ruleAlerts {
		alerts[i] = metricsexplorertypes.MetricAlert{
			AlertName: ruleAlert.AlertName,
			AlertID:   ruleAlert.AlertID,
		}
	}

	return &metricsexplorertypes.MetricAlertsResponse{
		Alerts: alerts,
	}, nil
}

func (m *module) GetMetricDashboards(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricDashboardsResponse, error) {
	if metricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	data, err := m.dashboardModule.GetByMetricNames(ctx, orgID, []string{metricName})
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get dashboards for metric")
	}

	return newMetricDashboardsResponse(data[metricName]), nil
}

func (m *module) GetMetricDashboardsV2(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricDashboardPanelsResponse, error) {
	if metricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	data, err := m.dashboardModule.GetByMetricNamesV2(ctx, orgID, []string{metricName})
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get dashboards for metric")
	}

	return metricsexplorertypes.NewMetricDashboardPanelsResponse(data[metricName]), nil
}

func newMetricDashboardsResponse(dashboardList []dashboardtypes.DashboardPanelRef) *metricsexplorertypes.MetricDashboardsResponse {
	dashboards := make([]metricsexplorertypes.MetricDashboard, 0, len(dashboardList))
	for _, item := range dashboardList {
		dashboards = append(dashboards, metricsexplorertypes.MetricDashboard{
			DashboardName: item.DashboardName,
			DashboardID:   item.DashboardID,
			WidgetID:      item.PanelID,
			WidgetName:    item.PanelName,
		})
	}

	return &metricsexplorertypes.MetricDashboardsResponse{
		Dashboards: dashboards,
	}
}

// GetMetricHighlights returns highlights for a metric including data points, last received, total time series, and active time series.
func (m *module) GetMetricHighlights(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricHighlightsResponse, error) {
	if metricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metric name is required")
	}

	var response metricsexplorertypes.MetricHighlightsResponse

	g, gCtx := errgroup.WithContext(ctx)

	// Fetch data points
	g.Go(func() error {
		dataPoints, err := m.getMetricDataPoints(gCtx, metricName)
		if err != nil {
			return err
		}
		response.DataPoints = dataPoints
		return nil
	})

	// Fetch last received
	g.Go(func() error {
		lastReceived, err := m.getMetricLastReceived(gCtx, metricName)
		if err != nil {
			return err
		}
		response.LastReceived = lastReceived
		return nil
	})

	// Fetch total time series
	g.Go(func() error {
		totalTimeSeries, err := m.getTotalTimeSeriesForMetricName(gCtx, metricName)
		if err != nil {
			return err
		}
		response.TotalTimeSeries = totalTimeSeries
		return nil
	})

	// Fetch active time series (using 120 minutes as default duration)
	g.Go(func() error {
		activeTimeSeries, err := m.getActiveTimeSeriesForMetricName(gCtx, metricName, 120*time.Minute)
		if err != nil {
			return err
		}
		response.ActiveTimeSeries = activeTimeSeries
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &response, nil
}

func (m *module) GetMetricAttributes(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.MetricAttributesRequest) (*metricsexplorertypes.MetricAttributesResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	attributes, err := m.fetchMetricAttributes(ctx, req.MetricName, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	return &metricsexplorertypes.MetricAttributesResponse{
		Attributes: attributes,
		TotalKeys:  int64(len(attributes)),
	}, nil
}

func (m *module) CheckMetricExists(ctx context.Context, orgID valuer.UUID, metricName string) (bool, error) {
	ctx = m.withMetricsExplorerContext(ctx, "CheckMetricExists")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*) > 0 as metricExists")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(sb.E("metric_name", metricName))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	var exists bool
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)

	err := db.QueryRow(valueCtx, query, args...).Scan(&exists)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to check if metric exists")
	}

	return exists, nil
}

func (m *module) HasNonSigNozMetrics(ctx context.Context) (bool, error) {
	ctx = m.withMetricsExplorerContext(ctx, "HasNonSigNozMetrics")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*) > 0")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV41weekTableName))
	sb.Where("metric_name NOT LIKE 'signoz_%'")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	var hasMetrics bool
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)

	err := db.QueryRow(valueCtx, query, args...).Scan(&hasMetrics)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to check for non-signoz metrics")
	}

	return hasMetrics, nil
}

func (m *module) InspectMetrics(
	ctx context.Context,
	orgID valuer.UUID,
	req *metricsexplorertypes.InspectMetricsRequest,
) (*metricsexplorertypes.InspectMetricsResponse, error) {
	ctx = m.withMetricsExplorerContext(ctx, "InspectMetrics")

	if err := req.Validate(); err != nil {
		return nil, err
	}

	start := uint64(req.Start)
	end := uint64(req.End)

	filterWhereClause, err := m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	tsStart, _, tsTable, _ := telemetrymetrics.WhichTSTableToUse(start, end, false, nil)
	tsSb := sqlbuilder.NewSelectBuilder()
	tsSb.Select("fingerprint", "labels")
	tsSb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, tsTable))
	tsSb.Where(
		tsSb.E("metric_name", req.MetricName),
		tsSb.GE("unix_milli", tsStart),
		tsSb.LE("unix_milli", end),
	)
	if filterWhereClause != nil {
		tsSb.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	tsSb.GroupBy("fingerprint", "labels")
	tsSb.Limit(50)

	tsQuery, tsArgs := tsSb.BuildWithFlavor(sqlbuilder.ClickHouse)
	db := m.telemetryStore.ClickhouseDB()
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)

	tsRows, err := db.Query(valueCtx, tsQuery, tsArgs...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query time series for inspect")
	}
	defer tsRows.Close()

	type tsInfo struct {
		fingerprint uint64
		labels      map[string]string
	}
	var tsList []tsInfo
	var fingerprints []any

	for tsRows.Next() {
		var fp uint64
		var labelsStr string
		if err := tsRows.Scan(&fp, &labelsStr); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan time series row")
		}
		parsedLabels := make(map[string]string)
		if err := json.Unmarshal([]byte(labelsStr), &parsedLabels); err != nil {
			parsedLabels = map[string]string{}
		}
		tsList = append(tsList, tsInfo{fingerprint: fp, labels: parsedLabels})
		fingerprints = append(fingerprints, fp)
	}
	if err := tsRows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to iterate time series rows")
	}

	if len(fingerprints) == 0 {
		return &metricsexplorertypes.InspectMetricsResponse{Series: []*qbtypes.TimeSeries{}}, nil
	}

	samplesSb := sqlbuilder.NewSelectBuilder()
	samplesSb.Select("fingerprint", "unix_milli", "value")
	samplesSb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4TableName))
	samplesSb.Where(
		samplesSb.In("fingerprint", fingerprints...),
		samplesSb.E("metric_name", req.MetricName),
		samplesSb.GE("unix_milli", int64(start)),
		samplesSb.LE("unix_milli", int64(end)),
	)
	samplesSb.OrderBy("fingerprint", "unix_milli")

	samplesQuery, samplesArgs := samplesSb.BuildWithFlavor(sqlbuilder.ClickHouse)
	samplesRows, err := db.Query(valueCtx, samplesQuery, samplesArgs...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query samples for inspect")
	}
	defer samplesRows.Close()

	valuesMap := make(map[uint64][]*qbtypes.TimeSeriesValue)
	for samplesRows.Next() {
		var fp uint64
		var unixMilli int64
		var value float64
		if err := samplesRows.Scan(&fp, &unixMilli, &value); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan samples row")
		}
		valuesMap[fp] = append(valuesMap[fp], &qbtypes.TimeSeriesValue{
			Timestamp: unixMilli,
			Value:     value,
		})
	}
	if err := samplesRows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to iterate samples rows")
	}

	series := make([]*qbtypes.TimeSeries, 0, len(tsList))
	for _, ts := range tsList {
		labels := make([]*qbtypes.Label, 0, len(ts.labels))
		for k, v := range ts.labels {
			labels = append(labels, &qbtypes.Label{
				Key:   telemetrytypes.TelemetryFieldKey{Name: k},
				Value: v,
			})
		}
		values := valuesMap[ts.fingerprint]
		if values == nil {
			values = []*qbtypes.TimeSeriesValue{}
		}
		series = append(series, &qbtypes.TimeSeries{
			Labels: labels,
			Values: values,
		})
	}

	return &metricsexplorertypes.InspectMetricsResponse{Series: series}, nil
}

func (m *module) fetchMetadataFromCache(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsexplorertypes.MetricMetadata, []string) {
	hits := make(map[string]*metricsexplorertypes.MetricMetadata)
	misses := make([]string, 0)
	for _, metricName := range metricNames {
		cacheKey := generateMetricMetadataCacheKey(metricName)
		var cachedMetadata metricsexplorertypes.MetricMetadata
		if err := m.cache.Get(ctx, orgID, cacheKey, &cachedMetadata); err == nil {
			hits[metricName] = &cachedMetadata
		} else {
			m.logger.WarnContext(ctx, "cache miss for metric metadata", slog.String("metric_name", metricName))
			misses = append(misses, metricName)
		}
	}
	return hits, misses
}

func (m *module) fetchUpdatedMetadata(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsexplorertypes.MetricMetadata, error) {
	ctx = m.withMetricsExplorerContext(ctx, "fetchUpdatedMetadata")

	if len(metricNames) == 0 {
		return map[string]*metricsexplorertypes.MetricMetadata{}, nil
	}

	args := make([]any, len(metricNames))
	for i := range metricNames {
		args[i] = metricNames[i]
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"metric_name",
		"argMax(description, created_at) AS description",
		"argMax(type, created_at) AS type",
		"argMax(unit, created_at) AS unit",
		"argMax(temporality, created_at) AS temporality",
		"argMax(is_monotonic, created_at) AS is_monotonic",
	)
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.UpdatedMetadataTableName))
	sb.Where(sb.In("metric_name", args...))
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch updated metrics metadata")
	}
	defer rows.Close()

	result := make(map[string]*metricsexplorertypes.MetricMetadata)
	for rows.Next() {
		var (
			metricMetadata metricsexplorertypes.MetricMetadata
			metricName     string
		)

		if err := rows.Scan(&metricName, &metricMetadata.Description, &metricMetadata.MetricType, &metricMetadata.MetricUnit, &metricMetadata.Temporality, &metricMetadata.IsMonotonic); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan updated metrics metadata")
		}
		result[metricName] = &metricMetadata

		cacheKey := generateMetricMetadataCacheKey(metricName)
		if err := m.cache.Set(ctx, orgID, cacheKey, &metricMetadata, 0); err != nil {
			m.logger.WarnContext(ctx, "failed to set metric metadata in cache", slog.String("metric_name", metricName), errors.Attr(err))
		}
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating updated metrics metadata rows")
	}

	return result, nil
}

func (m *module) fetchTimeseriesMetadata(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsexplorertypes.MetricMetadata, error) {
	ctx = m.withMetricsExplorerContext(ctx, "fetchTimeseriesMetadata")

	if len(metricNames) == 0 {
		return map[string]*metricsexplorertypes.MetricMetadata{}, nil
	}

	args := make([]any, len(metricNames))
	for i := range metricNames {
		args[i] = metricNames[i]
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"metric_name",
		"anyLast(description) AS description",
		"anyLast(type) AS metric_type",
		"argMax(unit, unix_milli) AS metric_unit",
		"anyLast(temporality) AS temporality",
		"anyLast(is_monotonic) AS is_monotonic",
	)
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4TableName))
	sb.Where(sb.In("metric_name", args...))
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch metrics metadata from timeseries table")
	}
	defer rows.Close()

	result := make(map[string]*metricsexplorertypes.MetricMetadata)
	for rows.Next() {
		var (
			metricMetadata metricsexplorertypes.MetricMetadata
			metricName     string
		)

		if err := rows.Scan(&metricName, &metricMetadata.Description, &metricMetadata.MetricType, &metricMetadata.MetricUnit, &metricMetadata.Temporality, &metricMetadata.IsMonotonic); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan timeseries metadata")
		}
		result[metricName] = &metricMetadata

		cacheKey := generateMetricMetadataCacheKey(metricName)
		if err := m.cache.Set(ctx, orgID, cacheKey, &metricMetadata, 0); err != nil {
			m.logger.WarnContext(ctx, "failed to set metric metadata in cache", slog.String("metric_name", metricName), errors.Attr(err))
		}
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating timeseries metadata rows")
	}

	return result, nil
}

func (m *module) validateAndNormalizeMetricType(req *metricsexplorertypes.UpdateMetricMetadataRequest) error {
	switch req.Type {
	case metrictypes.SumType:
		if req.Temporality.IsZero() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "temporality is required when metric type is Sum")
		}
		if req.Temporality != metrictypes.Delta && req.Temporality != metrictypes.Cumulative {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid value for temporality")
		}
		// Special case: if Sum is not monotonic and cumulative, convert to Gauge
		if !req.IsMonotonic && req.Temporality == metrictypes.Cumulative {
			req.Type = metrictypes.GaugeType
			req.Temporality = metrictypes.Unspecified
		}

	case metrictypes.HistogramType:
		if req.Temporality.IsZero() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "temporality is required when metric type is Histogram")
		}
		if req.Temporality != metrictypes.Delta && req.Temporality != metrictypes.Cumulative {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid value for temporality")
		}

	case metrictypes.ExpHistogramType:
		if req.Temporality.IsZero() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "temporality is required when metric type is exponential histogram")
		}
		if req.Temporality != metrictypes.Delta && req.Temporality != metrictypes.Cumulative {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid value for temporality")
		}

	case metrictypes.GaugeType:
		// Gauge always has unspecified temporality
		req.Temporality = metrictypes.Unspecified

	case metrictypes.SummaryType:
		// Summary always has cumulative temporality
		req.Temporality = metrictypes.Cumulative

	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid metric type")
	}

	return nil
}

func (m *module) validateMetricLabels(ctx context.Context, req *metricsexplorertypes.UpdateMetricMetadataRequest) error {
	if req.Type == metrictypes.HistogramType {
		hasLabel, err := m.checkForLabelInMetric(ctx, req.MetricName, "le")
		if err != nil {
			return err
		}
		if !hasLabel {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric '%s' cannot be set as histogram type: histogram metrics require the 'le' (less than or equal) label for bucket boundaries", req.MetricName)
		}
	}

	if req.Type == metrictypes.SummaryType {
		hasLabel, err := m.checkForLabelInMetric(ctx, req.MetricName, "quantile")
		if err != nil {
			return err
		}
		if !hasLabel {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric '%s' cannot be set as summary type: summary metrics require the 'quantile' label for quantile values", req.MetricName)
		}
	}

	return nil
}

func (m *module) checkForLabelInMetric(ctx context.Context, metricName string, label string) (bool, error) {
	ctx = m.withMetricsExplorerContext(ctx, "checkForLabelInMetric")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*) > 0 AS has_label")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(sb.E("metric_name", metricName))
	sb.Where(sb.E("attr_name", label))
	sb.Limit(1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	var hasLabel bool
	db := m.telemetryStore.ClickhouseDB()
	err := db.QueryRow(valueCtx, query, args...).Scan(&hasLabel)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "error checking metric label %q", label)
	}

	return hasLabel, nil
}

func (m *module) insertMetricsMetadata(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.UpdateMetricMetadataRequest) error {
	ctx = m.withMetricsExplorerContext(ctx, "insertMetricsMetadata")
	createdAt := time.Now().UnixMilli()

	ib := sqlbuilder.NewInsertBuilder()
	ib.InsertInto(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.UpdatedMetadataTableName))
	ib.Cols("metric_name", "temporality", "is_monotonic", "type", "description", "unit", "created_at")
	ib.Values(
		req.MetricName,
		req.Temporality,
		req.IsMonotonic,
		req.Type,
		req.Description,
		req.Unit,
		createdAt,
	)

	query, args := ib.BuildWithFlavor(sqlbuilder.ClickHouse)

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	if err := db.Exec(valueCtx, query, args...); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to insert metrics metadata")
	}

	// Set in cache after successful DB insert
	metricMetadata := &metricsexplorertypes.MetricMetadata{
		Description: req.Description,
		MetricType:  req.Type,
		MetricUnit:  req.Unit,
		Temporality: req.Temporality,
		IsMonotonic: req.IsMonotonic,
	}
	cacheKey := generateMetricMetadataCacheKey(req.MetricName)
	if err := m.cache.Set(ctx, orgID, cacheKey, metricMetadata, 0); err != nil {
		m.logger.WarnContext(ctx, "failed to set metric metadata in cache after insert", slog.String("metric_name", req.MetricName), errors.Attr(err))
	}

	return nil
}

func (m *module) buildFilterClause(ctx context.Context, filter *qbtypes.Filter, startMillis, endMillis int64) (*sqlbuilder.WhereClause, error) {
	expression := ""
	if filter != nil {
		expression = strings.TrimSpace(filter.Expression)
	}
	if expression == "" {
		return sqlbuilder.NewWhereClause(), nil
	}

	whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(expression)
	for idx := range whereClauseSelectors {
		whereClauseSelectors[idx].Signal = telemetrytypes.SignalMetrics
		whereClauseSelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
		// whereClauseSelectors[idx].MetricContext = &telemetrytypes.MetricContext{
		// 	MetricName: query.Aggregations[0].MetricName,
		// }
		// whereClauseSelectors[idx].Source = query.Source
	}

	keys, _, err := m.telemetryMetadataStore.GetKeysMulti(ctx, whereClauseSelectors)
	if err != nil {
		return nil, err
	}

	opts := querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		Logger:           m.logger,
		FieldMapper:      m.fieldMapper,
		ConditionBuilder: m.condBuilder,
		FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "metric_name", FieldContext: telemetrytypes.FieldContextMetric},
		FieldKeys:        keys,
		StartNs:          querybuilder.ToNanoSecs(uint64(startMillis)),
		EndNs:            querybuilder.ToNanoSecs(uint64(endMillis)),
	}

	whereClause, err := querybuilder.PrepareWhereClause(expression, opts)
	if err != nil {
		return nil, err
	}

	if whereClause.IsEmpty() {
		return sqlbuilder.NewWhereClause(), nil
	}

	return whereClause.WhereClause, nil
}

func (m *module) fetchMetricsStatsWithSamples(
	ctx context.Context,
	orgID valuer.UUID,
	req *metricsexplorertypes.StatsRequest,
) ([]metricsexplorertypes.Stat, uint64, error) {
	ctx = m.withMetricsExplorerContext(ctx, "fetchMetricsStatsWithSamples")

	reductionEnabled := m.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID))

	hasFilter := req.Filter != nil && strings.TrimSpace(req.Filter.Expression) != ""
	var filterWhereClause *sqlbuilder.WhereClause
	if hasFilter {
		var err error
		filterWhereClause, err = m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
		if err != nil {
			return nil, 0, err
		}
	}

	start, end, distributedTsTable, localTsTable := telemetrymetrics.WhichTSTableToUse(uint64(req.Start), uint64(req.End), false, nil)
	distributedSamplesTable, _ := telemetrymetrics.WhichSamplesTableToUse(uint64(req.Start), uint64(req.End), metrictypes.UnspecifiedType, metrictypes.TimeAggregationUnspecified, false, nil)
	countExp := telemetrymetrics.CountExpressionForSamplesTable(distributedSamplesTable)

	// Timeseries counts per metric
	tsSB := sqlbuilder.NewSelectBuilder()
	tsSB.Select(
		"metric_name",
		"uniq(fingerprint) AS timeseries",
	)
	tsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	tsSB.Where(tsSB.Between("unix_milli", start, end))
	tsSB.Where("NOT startsWith(metric_name, 'signoz')")
	if filterWhereClause != nil {
		tsSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	tsSB.GroupBy("metric_name")

	// Samples counts per metric
	samplesSB := sqlbuilder.NewSelectBuilder()
	samplesSB.Select(
		"metric_name",
		fmt.Sprintf("%s AS samples", countExp),
	)
	samplesSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedSamplesTable))
	samplesSB.Where(samplesSB.Between("unix_milli", req.Start, req.End))
	samplesSB.Where("NOT startsWith(metric_name, 'signoz')")

	ctes := []*sqlbuilder.CTEQueryBuilder{
		sqlbuilder.CTEQuery("__time_series_counts").As(tsSB),
	}

	// Narrow samples scan. With filter: fingerprint IN (per-fingerprint label preds can't fold to metric_name).
	// No filter (fast path): metric_name IN — aligns with samples table's leading sort key, orders of magnitude cheaper.
	if filterWhereClause != nil {
		fingerprintSB := sqlbuilder.NewSelectBuilder()
		fingerprintSB.Select("fingerprint")
		fingerprintSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTsTable))
		fingerprintSB.Where(fingerprintSB.Between("unix_milli", start, end))
		fingerprintSB.Where("NOT startsWith(metric_name, 'signoz')")
		fingerprintSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
		fingerprintSB.GroupBy("fingerprint")

		ctes = append(ctes, sqlbuilder.CTEQuery("__filtered_fingerprints").As(fingerprintSB))
		samplesSB.Where("fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints)")
	} else {
		metricNamesSB := sqlbuilder.NewSelectBuilder()
		metricNamesSB.Select("DISTINCT metric_name")
		metricNamesSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTsTable))
		metricNamesSB.Where(metricNamesSB.Between("unix_milli", start, end))
		metricNamesSB.Where("NOT startsWith(metric_name, 'signoz')")

		samplesSB.Where(fmt.Sprintf("metric_name IN (%s)", samplesSB.Var(metricNamesSB)))
	}
	samplesSB.GroupBy("metric_name")

	ctes = append(ctes, sqlbuilder.CTEQuery("__sample_counts").As(samplesSB))

	orderByColumn, orderDirection, err := getStatsOrderByColumn(req.OrderBy)
	if err != nil {
		return nil, 0, err
	}

	var finalSB *sqlbuilder.SelectBuilder
	if reductionEnabled {
		reducedTsSB := sqlbuilder.NewSelectBuilder()
		reducedTsSB.Select(
			"metric_name",
			"uniq(fingerprint) AS timeseries",
		)

		// the data lands either of the _reduced_last/_reduced_sum tables
		reducedLastSB := sqlbuilder.NewSelectBuilder()
		reducedLastSB.Select("metric_name", "uniq(reduced_fingerprint, unix_milli) AS cnt")
		reducedLastSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4ReducedLastTableName))
		reducedLastSB.Where(reducedLastSB.Between("unix_milli", req.Start, req.End))
		reducedLastSB.Where("NOT startsWith(metric_name, 'signoz')")

		reducedSumSB := sqlbuilder.NewSelectBuilder()
		reducedSumSB.Select("metric_name", "uniq(reduced_fingerprint, unix_milli) AS cnt")
		reducedSumSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4ReducedSumTableName))
		reducedSumSB.Where(reducedSumSB.Between("unix_milli", req.Start, req.End))
		reducedSumSB.Where("NOT startsWith(metric_name, 'signoz')")

		// separate query for reduced series counts
		reducedTsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedTableName))
		reducedTsSB.Where(reducedTsSB.Between("unix_milli", start, end))
		reducedTsSB.Where("NOT startsWith(metric_name, 'signoz')")
		reducedTsSB.GroupBy("metric_name")

		if filterWhereClause != nil {
			reducedTsSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))

			// samples uses a separate cte with local table
			reducedFpSB := sqlbuilder.NewSelectBuilder()
			reducedFpSB.Select("fingerprint")
			reducedFpSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedLocalTableName))
			reducedFpSB.Where(reducedFpSB.Between("unix_milli", start, end))
			reducedFpSB.Where("NOT startsWith(metric_name, 'signoz')")
			reducedFpSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
			reducedFpSB.GroupBy("fingerprint")
			ctes = append(ctes, sqlbuilder.CTEQuery("__reduced_filtered_fingerprints").As(reducedFpSB))

			reducedLastSB.Where("reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)")
			reducedSumSB.Where("reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)")
		}
		reducedLastSB.GroupBy("metric_name")
		reducedSumSB.GroupBy("metric_name")

		reducedSamplesSB := sqlbuilder.NewSelectBuilder()
		reducedSamplesSB.Select("metric_name", "sum(cnt) AS samples")
		reducedSamplesSB.From(reducedSamplesSB.BuilderAs(sqlbuilder.UnionAll(reducedLastSB, reducedSumSB), "reduced_samples"))
		reducedSamplesSB.GroupBy("metric_name")

		ctes = append(ctes,
			sqlbuilder.CTEQuery("__reduced_time_series_counts").As(reducedTsSB),
			sqlbuilder.CTEQuery("__reduced_sample_counts").As(reducedSamplesSB),
		)

		cteBuilder := sqlbuilder.With(ctes...)

		finalSB = cteBuilder.Select(
			"COALESCE(ts.metric_name, rts.metric_name, s.metric_name, rs.metric_name) AS metric_name",
			"COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) AS timeseries",
			"COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) AS samples",
			"COUNT(*) OVER() AS total",
		)
		finalSB.From("__time_series_counts ts")
		finalSB.JoinWithOption(sqlbuilder.FullOuterJoin, "__reduced_time_series_counts rts", "ts.metric_name = rts.metric_name")
		finalSB.JoinWithOption(sqlbuilder.FullOuterJoin, "__sample_counts s", "COALESCE(ts.metric_name, rts.metric_name) = s.metric_name")
		finalSB.JoinWithOption(sqlbuilder.FullOuterJoin, "__reduced_sample_counts rs", "COALESCE(ts.metric_name, rts.metric_name, s.metric_name) = rs.metric_name")
		finalSB.Where("(COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) > 0 OR COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) > 0)")
	} else {
		cteBuilder := sqlbuilder.With(ctes...)

		finalSB = cteBuilder.Select(
			"COALESCE(ts.metric_name, s.metric_name) AS metric_name",
			"COALESCE(ts.timeseries, 0) AS timeseries",
			"COALESCE(s.samples, 0) AS samples",
			"COUNT(*) OVER() AS total",
		)
		finalSB.From("__time_series_counts ts")
		finalSB.JoinWithOption(sqlbuilder.FullOuterJoin, "__sample_counts s", "ts.metric_name = s.metric_name")
		finalSB.Where("(COALESCE(ts.timeseries, 0) > 0 OR COALESCE(s.samples, 0) > 0)")
	}

	finalSB.OrderBy(
		fmt.Sprintf("%s %s", orderByColumn, strings.ToUpper(orderDirection)),
		"metric_name ASC",
	)
	finalSB.Limit(req.Limit)
	finalSB.Offset(req.Offset)

	query, args := finalSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	if reductionEnabled {
		// unmatched FULL JOIN columns must be NULL (not '') for the COALESCE name/keys to resolve
		query += " SETTINGS join_use_nulls = 1"
	}

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute metrics stats with samples query")
	}
	defer rows.Close()

	metricStats := make([]metricsexplorertypes.Stat, 0)
	var total uint64

	for rows.Next() {
		var (
			metricStat metricsexplorertypes.Stat
			rowTotal   uint64
		)
		if err := rows.Scan(&metricStat.MetricName, &metricStat.TimeSeries, &metricStat.Samples, &rowTotal); err != nil {
			return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan metrics stats row")
		}
		metricStats = append(metricStats, metricStat)
		total = rowTotal
	}

	if err := rows.Err(); err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "error iterating metrics stats rows")
	}

	return metricStats, total, nil
}

func (m *module) computeTimeseriesTreemap(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.TreemapRequest) ([]metricsexplorertypes.TreemapEntry, error) {
	ctx = m.withMetricsExplorerContext(ctx, "computeTimeseriesTreemap")

	reductionEnabled := m.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID))

	hasFilter := req.Filter != nil && strings.TrimSpace(req.Filter.Expression) != ""
	var filterWhereClause *sqlbuilder.WhereClause
	if hasFilter {
		var err error
		filterWhereClause, err = m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
		if err != nil {
			return nil, err
		}
	}

	start, end, distributedTsTable, _ := telemetrymetrics.WhichTSTableToUse(uint64(req.Start), uint64(req.End), false, nil)

	totalTSBuilder := sqlbuilder.NewSelectBuilder()
	totalTSBuilder.Select("uniq(fingerprint) AS total_time_series")
	totalTSBuilder.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	totalTSBuilder.Where(totalTSBuilder.Between("unix_milli", start, end))

	metricsSB := sqlbuilder.NewSelectBuilder()
	metricsSB.Select(
		"metric_name",
		"uniq(fingerprint) AS total_value",
	)
	metricsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	metricsSB.Where(metricsSB.Between("unix_milli", start, end))
	metricsSB.Where("NOT startsWith(metric_name, 'signoz')")
	if filterWhereClause != nil {
		metricsSB.WhereClause.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	metricsSB.GroupBy("metric_name")

	var finalSB *sqlbuilder.SelectBuilder
	if reductionEnabled {
		reducedTotalTSBuilder := sqlbuilder.NewSelectBuilder()
		reducedTotalTSBuilder.Select("uniq(fingerprint) AS total_time_series")
		reducedTotalTSBuilder.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedTableName))
		reducedTotalTSBuilder.Where(reducedTotalTSBuilder.Between("unix_milli", start, end))

		reducedMetricsSB := sqlbuilder.NewSelectBuilder()
		reducedMetricsSB.Select(
			"metric_name",
			"uniq(fingerprint) AS total_value",
		)
		reducedMetricsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedTableName))
		reducedMetricsSB.Where(reducedMetricsSB.Between("unix_milli", start, end))
		reducedMetricsSB.Where("NOT startsWith(metric_name, 'signoz')")
		if filterWhereClause != nil {
			reducedMetricsSB.WhereClause.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
		}
		reducedMetricsSB.GroupBy("metric_name")

		cteBuilder := sqlbuilder.With(
			sqlbuilder.CTEQuery("__total_time_series").As(totalTSBuilder),
			sqlbuilder.CTEQuery("__metric_totals").As(metricsSB),
			sqlbuilder.CTEQuery("__reduced_total_time_series").As(reducedTotalTSBuilder),
			sqlbuilder.CTEQuery("__reduced_metric_totals").As(reducedMetricsSB),
		)

		finalSB = cteBuilder.Select(
			"COALESCE(mt.metric_name, rmt.metric_name) AS metric_name",
			"COALESCE(mt.total_value, 0) + COALESCE(rmt.total_value, 0) AS total_value",
			"CASE WHEN (tts.total_time_series + rtts.total_time_series) = 0 THEN 0 ELSE ((COALESCE(mt.total_value, 0) + COALESCE(rmt.total_value, 0)) * 100.0 / (tts.total_time_series + rtts.total_time_series)) END AS percentage",
		)
		finalSB.From("__metric_totals mt")
		finalSB.JoinWithOption(sqlbuilder.FullOuterJoin, "__reduced_metric_totals rmt", "mt.metric_name = rmt.metric_name")
		finalSB.Join("__total_time_series tts", "1=1")
		finalSB.Join("__reduced_total_time_series rtts", "1=1")
	} else {
		cteBuilder := sqlbuilder.With(
			sqlbuilder.CTEQuery("__total_time_series").As(totalTSBuilder),
			sqlbuilder.CTEQuery("__metric_totals").As(metricsSB),
		)

		finalSB = cteBuilder.Select(
			"mt.metric_name",
			"mt.total_value",
			"CASE WHEN tts.total_time_series = 0 THEN 0 ELSE (mt.total_value * 100.0 / tts.total_time_series) END AS percentage",
		)
		finalSB.From("__metric_totals mt")
		finalSB.Join("__total_time_series tts", "1=1")
	}
	finalSB.OrderByDesc("percentage")
	finalSB.Limit(req.Limit)

	query, args := finalSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	if reductionEnabled {
		// unmatched FULL JOIN columns must be NULL (not '') so COALESCE on metric_name resolves
		query += " SETTINGS join_use_nulls = 1"
	}

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute timeseries treemap query")
	}
	defer rows.Close()

	entries := make([]metricsexplorertypes.TreemapEntry, 0)
	for rows.Next() {
		var treemapEntry metricsexplorertypes.TreemapEntry
		if err := rows.Scan(&treemapEntry.MetricName, &treemapEntry.TotalValue, &treemapEntry.Percentage); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan timeseries treemap row")
		}
		entries = append(entries, treemapEntry)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating timeseries treemap rows")
	}

	return entries, nil
}

func (m *module) computeSamplesTreemap(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.TreemapRequest) ([]metricsexplorertypes.TreemapEntry, error) {
	ctx = m.withMetricsExplorerContext(ctx, "computeSamplesTreemap")

	reductionEnabled := m.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID))

	hasFilter := req.Filter != nil && strings.TrimSpace(req.Filter.Expression) != ""
	var filterWhereClause *sqlbuilder.WhereClause
	if hasFilter {
		var err error
		filterWhereClause, err = m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
		if err != nil {
			return nil, err
		}
	}

	start, end, distributedTsTable, localTsTable := telemetrymetrics.WhichTSTableToUse(uint64(req.Start), uint64(req.End), false, nil)
	distributedSamplesTable, _ := telemetrymetrics.WhichSamplesTableToUse(uint64(req.Start), uint64(req.End), metrictypes.UnspecifiedType, metrictypes.TimeAggregationUnspecified, false, nil)
	countExp := telemetrymetrics.CountExpressionForSamplesTable(distributedSamplesTable)

	candidateLimit := req.Limit + 50

	metricCandidatesSB := sqlbuilder.NewSelectBuilder()
	metricCandidatesSB.Select("metric_name")
	metricCandidatesSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	metricCandidatesSB.Where("NOT startsWith(metric_name, 'signoz')")
	metricCandidatesSB.Where(metricCandidatesSB.Between("unix_milli", start, end))
	if filterWhereClause != nil {
		metricCandidatesSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	metricCandidatesSB.GroupBy("metric_name")
	metricCandidatesSB.OrderBy("uniq(fingerprint) DESC")
	metricCandidatesSB.Limit(candidateLimit)

	cteQueries := []*sqlbuilder.CTEQueryBuilder{
		sqlbuilder.CTEQuery("__metric_candidates").As(metricCandidatesSB),
	}

	var reducedCandidatesSB *sqlbuilder.SelectBuilder
	if reductionEnabled {
		reducedCandidatesSB = sqlbuilder.NewSelectBuilder()
		reducedCandidatesSB.Select("metric_name")
		reducedCandidatesSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedTableName))
		reducedCandidatesSB.Where("NOT startsWith(metric_name, 'signoz')")
		reducedCandidatesSB.Where(reducedCandidatesSB.Between("unix_milli", start, end))
		if filterWhereClause != nil {
			reducedCandidatesSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
		}
		reducedCandidatesSB.GroupBy("metric_name")
		reducedCandidatesSB.OrderBy("uniq(fingerprint) DESC")
		reducedCandidatesSB.Limit(candidateLimit)

		cteQueries = append(cteQueries, sqlbuilder.CTEQuery("__reduced_metric_candidates").As(reducedCandidatesSB))
	}

	totalSamplesSB := sqlbuilder.NewSelectBuilder()
	totalSamplesSB.Select(fmt.Sprintf("%s AS total_samples", countExp))
	totalSamplesSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedSamplesTable))
	totalSamplesSB.Where(totalSamplesSB.Between("unix_milli", req.Start, req.End))

	sampleCountsSB := sqlbuilder.NewSelectBuilder()
	sampleCountsSB.Select(
		"metric_name",
		fmt.Sprintf("%s AS samples", countExp),
	)
	sampleCountsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedSamplesTable))
	sampleCountsSB.Where(sampleCountsSB.Between("unix_milli", req.Start, req.End))
	sampleCountsSB.Where("metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates)")

	// Reduced sample rows land in either the _reduced_last_60s or
	// _reduced_sum_60s table
	var reducedLastSB, reducedSumSB *sqlbuilder.SelectBuilder
	if reductionEnabled {
		reducedLastSB = sqlbuilder.NewSelectBuilder()
		reducedLastSB.Select("metric_name", "uniq(reduced_fingerprint, unix_milli) AS cnt")
		reducedLastSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4ReducedLastTableName))
		reducedLastSB.Where(reducedLastSB.Between("unix_milli", req.Start, req.End))
		reducedLastSB.Where("metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)")

		reducedSumSB = sqlbuilder.NewSelectBuilder()
		reducedSumSB.Select("metric_name", "uniq(reduced_fingerprint, unix_milli) AS cnt")
		reducedSumSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4ReducedSumTableName))
		reducedSumSB.Where(reducedSumSB.Between("unix_milli", req.Start, req.End))
		reducedSumSB.Where("metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)")
	}

	if filterWhereClause != nil {
		fingerprintSB := sqlbuilder.NewSelectBuilder()
		fingerprintSB.Select("fingerprint")
		fingerprintSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localTsTable))
		fingerprintSB.Where(fingerprintSB.Between("unix_milli", start, end))
		fingerprintSB.Where("NOT startsWith(metric_name, 'signoz')")
		fingerprintSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
		fingerprintSB.Where("metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates)")
		fingerprintSB.GroupBy("fingerprint")

		sampleCountsSB.Where("fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints)")

		if reductionEnabled {
			reducedFingerprintSB := sqlbuilder.NewSelectBuilder()
			reducedFingerprintSB.Select("fingerprint")
			reducedFingerprintSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4ReducedLocalTableName))
			reducedFingerprintSB.Where(reducedFingerprintSB.Between("unix_milli", start, end))
			reducedFingerprintSB.Where("NOT startsWith(metric_name, 'signoz')")
			reducedFingerprintSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
			reducedFingerprintSB.Where("metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)")
			reducedFingerprintSB.GroupBy("fingerprint")

			reducedLastSB.Where("reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)")
			reducedSumSB.Where("reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)")

			cteQueries = append(cteQueries,
				sqlbuilder.CTEQuery("__filtered_fingerprints").As(fingerprintSB),
				sqlbuilder.CTEQuery("__reduced_filtered_fingerprints").As(reducedFingerprintSB),
			)
		} else {
			cteQueries = append(cteQueries, sqlbuilder.CTEQuery("__filtered_fingerprints").As(fingerprintSB))
		}
	}

	sampleCountsSB.GroupBy("metric_name")

	var finalSB *sqlbuilder.SelectBuilder
	if reductionEnabled {
		reducedLastSB.GroupBy("metric_name")
		reducedSumSB.GroupBy("metric_name")

		reducedSampleCountsSB := sqlbuilder.NewSelectBuilder()
		reducedSampleCountsSB.Select("metric_name", "sum(cnt) AS samples")
		reducedSampleCountsSB.From(reducedSampleCountsSB.BuilderAs(sqlbuilder.UnionAll(reducedLastSB, reducedSumSB), "reduced_samples"))
		reducedSampleCountsSB.GroupBy("metric_name")

		// Grand total includes reduced sample volume so percentages stay consistent.
		reducedTotalLastSB := sqlbuilder.NewSelectBuilder()
		reducedTotalLastSB.Select("uniq(reduced_fingerprint, unix_milli) AS cnt")
		reducedTotalLastSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4ReducedLastTableName))
		reducedTotalLastSB.Where(reducedTotalLastSB.Between("unix_milli", req.Start, req.End))

		reducedTotalSumSB := sqlbuilder.NewSelectBuilder()
		reducedTotalSumSB.Select("uniq(reduced_fingerprint, unix_milli) AS cnt")
		reducedTotalSumSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4ReducedSumTableName))
		reducedTotalSumSB.Where(reducedTotalSumSB.Between("unix_milli", req.Start, req.End))

		reducedTotalSamplesSB := sqlbuilder.NewSelectBuilder()
		reducedTotalSamplesSB.Select("sum(cnt) AS total_samples")
		reducedTotalSamplesSB.From(reducedTotalSamplesSB.BuilderAs(sqlbuilder.UnionAll(reducedTotalLastSB, reducedTotalSumSB), "reduced_total"))

		allCandidatesSB := sqlbuilder.NewSelectBuilder()
		allCandidatesSB.Select("DISTINCT metric_name")
		allCandidatesSB.From(allCandidatesSB.BuilderAs(sqlbuilder.UnionAll(
			sqlbuilder.NewSelectBuilder().Select("metric_name").From("__metric_candidates"),
			sqlbuilder.NewSelectBuilder().Select("metric_name").From("__reduced_metric_candidates"),
		), "candidates"))

		cteQueries = append(cteQueries,
			sqlbuilder.CTEQuery("__sample_counts").As(sampleCountsSB),
			sqlbuilder.CTEQuery("__reduced_sample_counts").As(reducedSampleCountsSB),
			sqlbuilder.CTEQuery("__total_samples").As(totalSamplesSB),
			sqlbuilder.CTEQuery("__reduced_total_samples").As(reducedTotalSamplesSB),
			sqlbuilder.CTEQuery("__all_candidates").As(allCandidatesSB),
		)

		cteBuilder := sqlbuilder.With(cteQueries...)

		finalSB = cteBuilder.Select(
			"ac.metric_name",
			"COALESCE(sc.samples, 0) + COALESCE(rsc.samples, 0) AS samples",
			"CASE WHEN (ts.total_samples + rts.total_samples) = 0 THEN 0 ELSE ((COALESCE(sc.samples, 0) + COALESCE(rsc.samples, 0)) * 100.0 / (ts.total_samples + rts.total_samples)) END AS percentage",
		)
		finalSB.From("__all_candidates ac")
		finalSB.JoinWithOption(sqlbuilder.LeftJoin, "__sample_counts sc", "ac.metric_name = sc.metric_name")
		finalSB.JoinWithOption(sqlbuilder.LeftJoin, "__reduced_sample_counts rsc", "ac.metric_name = rsc.metric_name")
		finalSB.Join("__total_samples ts", "1=1")
		finalSB.Join("__reduced_total_samples rts", "1=1")
	} else {
		cteQueries = append(cteQueries,
			sqlbuilder.CTEQuery("__sample_counts").As(sampleCountsSB),
			sqlbuilder.CTEQuery("__total_samples").As(totalSamplesSB),
		)

		cteBuilder := sqlbuilder.With(cteQueries...)

		finalSB = cteBuilder.Select(
			"mc.metric_name",
			"COALESCE(sc.samples, 0) AS samples",
			"CASE WHEN ts.total_samples = 0 THEN 0 ELSE (COALESCE(sc.samples, 0) * 100.0 / ts.total_samples) END AS percentage",
		)
		finalSB.From("__metric_candidates mc")
		finalSB.JoinWithOption(sqlbuilder.LeftJoin, "__sample_counts sc", "mc.metric_name = sc.metric_name")
		finalSB.Join("__total_samples ts", "1=1")
	}
	finalSB.OrderBy("percentage DESC")
	finalSB.Limit(req.Limit)

	query, args := finalSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	if reductionEnabled {
		// unmatched LEFT JOIN sample columns must be NULL (not 0/'') so COALESCE applies
		query += " SETTINGS join_use_nulls = 1"
	}

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute samples treemap query")
	}
	defer rows.Close()

	entries := make([]metricsexplorertypes.TreemapEntry, 0)
	for rows.Next() {
		var treemapEntry metricsexplorertypes.TreemapEntry
		if err := rows.Scan(&treemapEntry.MetricName, &treemapEntry.TotalValue, &treemapEntry.Percentage); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan samples treemap row")
		}
		entries = append(entries, treemapEntry)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating samples treemap rows")
	}

	return entries, nil
}

// getMetricDataPoints returns the total number of data points (samples) for a metric.
func (m *module) getMetricDataPoints(ctx context.Context, metricName string) (uint64, error) {
	ctx = m.withMetricsExplorerContext(ctx, "getMetricDataPoints")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("sum(count) AS data_points")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4Agg30mTableName))
	sb.Where(sb.E("metric_name", metricName))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	var dataPoints uint64
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	err := db.QueryRow(valueCtx, query, args...).Scan(&dataPoints)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to get metrics data points")
	}

	return dataPoints, nil
}

// getMetricLastReceived returns the last received timestamp for a metric.
func (m *module) getMetricLastReceived(ctx context.Context, metricName string) (uint64, error) {
	ctx = m.withMetricsExplorerContext(ctx, "getMetricLastReceived")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("MAX(last_reported_unix_milli) AS last_received_time")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(sb.E("metric_name", metricName))
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	var lastReceived sql.NullInt64
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	err := db.QueryRow(valueCtx, query, args...).Scan(&lastReceived)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to get last received timestamp")
	}

	if !lastReceived.Valid {
		return 0, nil
	}

	return uint64(lastReceived.Int64), nil
}

// getTotalTimeSeriesForMetricName returns the total number of unique time series for a metric.
func (m *module) getTotalTimeSeriesForMetricName(ctx context.Context, metricName string) (uint64, error) {
	ctx = m.withMetricsExplorerContext(ctx, "getTotalTimeSeriesForMetricName")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("uniq(fingerprint) AS time_series_count")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV41weekTableName))
	sb.Where(sb.E("metric_name", metricName))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	var timeSeriesCount uint64
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	err := db.QueryRow(valueCtx, query, args...).Scan(&timeSeriesCount)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to get total time series count")
	}

	return timeSeriesCount, nil
}

// getActiveTimeSeriesForMetricName returns the number of active time series for a metric within the given duration.
func (m *module) getActiveTimeSeriesForMetricName(ctx context.Context, metricName string, duration time.Duration) (uint64, error) {
	ctx = m.withMetricsExplorerContext(ctx, "getActiveTimeSeriesForMetricName")

	milli := time.Now().Add(-duration).UnixMilli()

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("uniq(fingerprint) AS active_time_series")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4TableName))
	sb.Where(sb.E("metric_name", metricName))
	sb.Where(sb.GTE("unix_milli", milli))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	db := m.telemetryStore.ClickhouseDB()
	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	var activeTimeSeries uint64
	err := db.QueryRow(valueCtx, query, args...).Scan(&activeTimeSeries)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to get active time series count")
	}

	return activeTimeSeries, nil
}

func (m *module) fetchMetricAttributes(ctx context.Context, metricName string, start, end *int64) ([]metricsexplorertypes.MetricAttribute, error) {
	ctx = m.withMetricsExplorerContext(ctx, "fetchMetricAttributes")

	// Build query using sqlbuilder
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"attr_name AS key",
		"groupUniqArray(1000)(attr_string_value) AS values",
		"uniq(attr_string_value) AS valueCount",
	)
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(sb.E("metric_name", metricName))
	sb.Where("NOT startsWith(attr_name, '__')")

	// Add time range filtering if provided
	if start != nil {
		// Filter by start time: attributes that were active at or after start time
		sb.Where(sb.GE("last_reported_unix_milli", *start))
	}
	if end != nil {
		// Filter by end time: attributes that were active at or before end time
		sb.Where(sb.LE("first_reported_unix_milli", *end))
	}

	sb.GroupBy("attr_name")
	sb.OrderBy("valueCount DESC")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	valueCtx := ctxtypes.SetClickhouseMaxThreads(ctx, m.config.TelemetryStore.Threads)
	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch metric attributes")
	}
	defer rows.Close()

	attributes := make([]metricsexplorertypes.MetricAttribute, 0)
	for rows.Next() {
		var attr metricsexplorertypes.MetricAttribute
		if err := rows.Scan(&attr.Key, &attr.Values, &attr.ValueCount); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan metric attribute row")
		}
		attributes = append(attributes, attr)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating metric attribute rows")
	}

	return attributes, nil
}

func (m *module) withMetricsExplorerContext(ctx context.Context, functionName string) context.Context {
	comments := map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metrics-explorer",
		instrumentationtypes.CodeFunctionName: functionName,
	}
	return ctxtypes.NewContextWithCommentVals(ctx, comments)
}
