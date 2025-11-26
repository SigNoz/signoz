package implmetricsmodule

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/metricsmodule"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	fieldMapper            qbtypes.FieldMapper
	condBuilder            qbtypes.ConditionBuilder
	logger                 *slog.Logger
	cache                  cache.Cache
}

// NewModule constructs the metrics module with the provided dependencies.
func NewModule(ts telemetrystore.TelemetryStore, telemetryMetadataStore telemetrytypes.MetadataStore, cache cache.Cache, providerSettings factory.ProviderSettings) metricsmodule.Module {
	fieldMapper := telemetrymetrics.NewFieldMapper()
	condBuilder := telemetrymetrics.NewConditionBuilder(fieldMapper)
	return &module{
		telemetryStore:         ts,
		fieldMapper:            fieldMapper,
		condBuilder:            condBuilder,
		logger:                 providerSettings.Logger,
		telemetryMetadataStore: telemetryMetadataStore,
		cache:                  cache,
	}
}

func (m *module) GetStats(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.StatsRequest) (*metricsmoduletypes.StatsResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	filterWhereClause, err := m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	// Single query to get stats with samples, timeseries counts in required sorting order
	metricStats, total, err := m.fetchMetricsStatsWithSamples(
		ctx,
		req,
		filterWhereClause,
		false,
		req.OrderBy,
	)
	if err != nil {
		return nil, err
	}

	if len(metricStats) == 0 {
		return &metricsmoduletypes.StatsResponse{
			Metrics: []metricsmoduletypes.Stat{},
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

	return &metricsmoduletypes.StatsResponse{
		Metrics: metricStats,
		Total:   total,
	}, nil
}

// GetTreemap will return metrics treemap information once implemented.
func (m *module) GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.TreemapRequest) (*metricsmoduletypes.TreemapResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	filterWhereClause, err := m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	resp := &metricsmoduletypes.TreemapResponse{}
	switch req.Treemap {
	case metricsmoduletypes.TreemapModeSamples:
		entries, err := m.computeSamplesTreemap(ctx, req, filterWhereClause)
		if err != nil {
			return nil, err
		}
		resp.Samples = entries
	default: // TreemapModeTimeSeries
		entries, err := m.computeTimeseriesTreemap(ctx, req, filterWhereClause)
		if err != nil {
			return nil, err
		}
		resp.TimeSeries = entries
	}

	return resp, nil
}

func (m *module) GetMetricMetadataMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsmoduletypes.MetricMetadata, error) {
	if len(metricNames) == 0 {
		return map[string]*metricsmoduletypes.MetricMetadata{}, nil
	}

	metadata := make(map[string]*metricsmoduletypes.MetricMetadata)
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

func (m *module) fetchMetadataFromCache(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsmoduletypes.MetricMetadata, []string) {
	hits := make(map[string]*metricsmoduletypes.MetricMetadata)
	misses := make([]string, 0)
	for _, metricName := range metricNames {
		cacheKey := generateMetricMetadataCacheKey(metricName)
		var cachedMetadata metricsmoduletypes.MetricMetadata
		if err := m.cache.Get(ctx, orgID, cacheKey, &cachedMetadata); err == nil {
			hits[metricName] = &cachedMetadata
		} else {
			m.logger.WarnContext(ctx, "cache miss for metric metadata", "metric_name", metricName, "error", err)
			misses = append(misses, metricName)
		}
	}
	return hits, misses
}

func (m *module) fetchUpdatedMetadata(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsmoduletypes.MetricMetadata, error) {
	if len(metricNames) == 0 {
		return map[string]*metricsmoduletypes.MetricMetadata{}, nil
	}

	args := make([]any, len(metricNames))
	for i := range metricNames {
		args[i] = metricNames[i]
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"metric_name",
		"description",
		"type",
		"unit",
		"temporality",
		"is_monotonic",
	)
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.UpdatedMetadataTableName))
	sb.Where(sb.In("metric_name", args...))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch updated metrics metadata")
	}
	defer rows.Close()

	result := make(map[string]*metricsmoduletypes.MetricMetadata)
	for rows.Next() {
		var (
			metricMetadata metricsmoduletypes.MetricMetadata
			metricName     string
		)

		if err := rows.Scan(&metricName, &metricMetadata.Description, &metricMetadata.MetricType, &metricMetadata.MetricUnit, &metricMetadata.Temporality, &metricMetadata.IsMonotonic); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan updated metrics metadata")
		}
		result[metricName] = &metricMetadata

		cacheKey := generateMetricMetadataCacheKey(metricName)
		if err := m.cache.Set(ctx, orgID, cacheKey, &metricMetadata, 0); err != nil {
			m.logger.WarnContext(ctx, "failed to set metric metadata in cache", "metric_name", metricName, "error", err)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating updated metrics metadata rows")
	}

	return result, nil
}

func (m *module) fetchTimeseriesMetadata(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsmoduletypes.MetricMetadata, error) {
	if len(metricNames) == 0 {
		return map[string]*metricsmoduletypes.MetricMetadata{}, nil
	}

	args := make([]any, len(metricNames))
	for i := range metricNames {
		args[i] = metricNames[i]
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"metric_name",
		"ANY_VALUE(description) AS description",
		"ANY_VALUE(type) AS metric_type",
		"ANY_VALUE(unit) AS metric_unit",
		"ANY_VALUE(temporality) AS temporality",
		"ANY_VALUE(is_monotonic) AS is_monotonic",
	)
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV4TableName))
	sb.Where(sb.In("metric_name", args...))
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch metrics metadata from timeseries table")
	}
	defer rows.Close()

	result := make(map[string]*metricsmoduletypes.MetricMetadata)
	for rows.Next() {
		var (
			metricMetadata metricsmoduletypes.MetricMetadata
			metricName     string
		)

		if err := rows.Scan(&metricName, &metricMetadata.Description, &metricMetadata.MetricType, &metricMetadata.MetricUnit, &metricMetadata.Temporality, &metricMetadata.IsMonotonic); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan timeseries metadata")
		}
		result[metricName] = &metricMetadata

		cacheKey := generateMetricMetadataCacheKey(metricName)
		if err := m.cache.Set(ctx, orgID, cacheKey, &metricMetadata, 0); err != nil {
			m.logger.WarnContext(ctx, "failed to set metric metadata in cache", "metric_name", metricName, "error", err)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating timeseries metadata rows")
	}

	return result, nil
}

func (m *module) UpdateMetricMetadata(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.UpdateMetricMetadataRequest) error {
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

	// Delete existing metadata
	if err := m.deleteMetricsMetadata(ctx, req.MetricName); err != nil {
		return err
	}

	// Insert new metadata
	if err := m.insertMetricsMetadata(ctx, orgID, req); err != nil {
		return err
	}

	return nil
}

func (m *module) validateAndNormalizeMetricType(req *metricsmoduletypes.UpdateMetricMetadataRequest) error {
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

func (m *module) validateMetricLabels(ctx context.Context, req *metricsmoduletypes.UpdateMetricMetadataRequest) error {
	if req.Type == metrictypes.HistogramType {
		labels := []string{"le"}
		hasLabels, err := m.checkForLabelsInMetric(ctx, req.MetricName, labels)
		if err != nil {
			return err
		}
		if !hasLabels {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric '%s' cannot be set as histogram type", req.MetricName)
		}
	}

	if req.Type == metrictypes.SummaryType {
		labels := []string{"quantile"}
		hasLabels, err := m.checkForLabelsInMetric(ctx, req.MetricName, labels)
		if err != nil {
			return err
		}
		if !hasLabels {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric '%s' cannot be set as summary type", req.MetricName)
		}
	}

	return nil
}

func (m *module) checkForLabelsInMetric(ctx context.Context, metricName string, labels []string) (bool, error) {
	if len(labels) == 0 {
		return true, nil
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*) > 0 AS has_labels")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.TimeseriesV41dayTableName))
	sb.Where(sb.E("metric_name", metricName))
	for _, label := range labels {
		sb.Where(fmt.Sprintf("JSONHas(labels, %s) = 1", sb.Var(label)))
	}
	sb.Limit(1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var hasLabels bool
	db := m.telemetryStore.ClickhouseDB()
	err := db.QueryRow(ctx, query, args...).Scan(&hasLabels)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "error checking metric labels")
	}

	return hasLabels, nil
}

func (m *module) deleteMetricsMetadata(ctx context.Context, metricName string) error {
	sb := sqlbuilder.NewDeleteBuilder()
	sb.DeleteFrom(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.UpdatedMetadataLocalTableName))
	sb.Where(sb.E("metric_name", metricName))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	if err := db.Exec(ctx, query, args...); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to delete metrics metadata")
	}
	return nil
}

func (m *module) insertMetricsMetadata(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.UpdateMetricMetadataRequest) error {
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

	db := m.telemetryStore.ClickhouseDB()
	if err := db.Exec(ctx, query, args...); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to insert metrics metadata")
	}

	// Set in cache after successful DB insert
	metricMetadata := &metricsmoduletypes.MetricMetadata{
		Description: req.Description,
		MetricType:  req.Type,
		MetricUnit:  req.Unit,
		Temporality: req.Temporality,
		IsMonotonic: req.IsMonotonic,
	}
	cacheKey := generateMetricMetadataCacheKey(req.MetricName)
	if err := m.cache.Set(ctx, orgID, cacheKey, metricMetadata, 0); err != nil {
		m.logger.WarnContext(ctx, "failed to set metric metadata in cache after insert", "metric_name", req.MetricName, "error", err)
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

	// TODO(nikhilmantri0902, srikanthccv): if this is the right way of dealing with  whereClauseSelectors
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
		Logger:           m.logger,
		FieldMapper:      m.fieldMapper,
		ConditionBuilder: m.condBuilder,
		FullTextColumn: &telemetrytypes.TelemetryFieldKey{
			Name: "labels"},
		FieldKeys: keys,
	}

	startNs := uint64(startMillis * 1_000_000)
	endNs := uint64(endMillis * 1_000_000)

	whereClause, err := querybuilder.PrepareWhereClause(expression, opts, startNs, endNs)
	if err != nil {
		return nil, err
	}

	if whereClause == nil || whereClause.WhereClause == nil {
		return sqlbuilder.NewWhereClause(), nil
	}

	return whereClause.WhereClause, nil
}

func (m *module) fetchMetricsStatsWithSamples(
	ctx context.Context,
	req *metricsmoduletypes.StatsRequest,
	filterWhereClause *sqlbuilder.WhereClause,
	normalized bool,
	orderBy *qbtypes.OrderBy,
) ([]metricsmoduletypes.Stat, uint64, error) {

	start, end, distributedTsTable, localTsTable := telemetrymetrics.WhichTSTableToUse(uint64(req.Start), uint64(req.End), nil)
	samplesTable, countExp := telemetrymetrics.WhichSamplesTableToUse(uint64(req.Start), uint64(req.End), metrictypes.UnspecifiedType, metrictypes.TimeAggregationUnspecified, nil)

	// Timeseries counts per metric
	tsSB := sqlbuilder.NewSelectBuilder()
	tsSB.Select(
		"metric_name",
		"uniq(fingerprint) AS timeseries",
	)
	tsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	tsSB.Where(tsSB.Between("unix_milli", start, end))
	tsSB.Where("NOT startsWith(metric_name, 'signoz')")
	tsSB.Where(tsSB.E("__normalized", normalized))
	if filterWhereClause != nil {
		tsSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	tsSB.GroupBy("metric_name")

	// Samples counts per metric
	samplesSB := sqlbuilder.NewSelectBuilder()
	samplesSB.Select(
		"dm.metric_name",
		fmt.Sprintf("%s AS samples", countExp),
	)
	samplesSB.From(fmt.Sprintf("%s.%s AS dm", telemetrymetrics.DBName, samplesTable))
	samplesSB.Where(samplesSB.Between("dm.unix_milli", req.Start, req.End))
	samplesSB.Where("NOT startsWith(dm.metric_name, 'signoz')")

	if filterWhereClause != nil {
		fingerprintSB := sqlbuilder.NewSelectBuilder()
		fingerprintSB.Select("ts.fingerprint")
		fingerprintSB.From(fmt.Sprintf("%s.%s AS ts", telemetrymetrics.DBName, localTsTable))
		fingerprintSB.Where(fingerprintSB.Between("ts.unix_milli", start, end))
		fingerprintSB.Where("NOT startsWith(ts.metric_name, 'signoz')")
		fingerprintSB.Where(fingerprintSB.E("__normalized", normalized))
		fingerprintSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
		fingerprintSB.GroupBy("ts.fingerprint")

		samplesSB.Where(fmt.Sprintf("dm.fingerprint IN (%s)", samplesSB.Var(fingerprintSB)))
	}
	samplesSB.GroupBy("dm.metric_name")

	cteBuilder := sqlbuilder.With(
		sqlbuilder.CTEQuery("__time_series_counts").As(tsSB),
		sqlbuilder.CTEQuery("__sample_counts").As(samplesSB),
	)

	finalSB := cteBuilder.Select(
		"COALESCE(ts.metric_name, s.metric_name) AS metric_name",
		"COALESCE(ts.timeseries, 0) AS timeseries",
		"COALESCE(s.samples, 0) AS samples",
		"COUNT(*) OVER() AS total",
	)
	finalSB.From("__time_series_counts ts")
	finalSB.JoinWithOption(sqlbuilder.FullOuterJoin, "__sample_counts s", "ts.metric_name = s.metric_name")
	finalSB.Where("(COALESCE(ts.timeseries, 0) > 0 OR COALESCE(s.samples, 0) > 0)")

	orderByColumn, orderDirection, err := getStatsOrderByColumn(orderBy)
	if err != nil {
		return nil, 0, err
	}

	finalSB.OrderBy(
		fmt.Sprintf("%s %s", orderByColumn, strings.ToUpper(orderDirection)),
		"metric_name ASC",
	)
	finalSB.Limit(req.Limit)
	finalSB.Offset(req.Offset)

	query, args := finalSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute metrics stats with samples query")
	}
	defer rows.Close()

	metricStats := make([]metricsmoduletypes.Stat, 0)
	var total uint64

	for rows.Next() {
		var (
			metricStat metricsmoduletypes.Stat
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

func (m *module) computeTimeseriesTreemap(ctx context.Context, req *metricsmoduletypes.TreemapRequest, filterWhereClause *sqlbuilder.WhereClause) ([]metricsmoduletypes.TreemapEntry, error) {
	start, end, distributedTsTable, _ := telemetrymetrics.WhichTSTableToUse(uint64(req.Start), uint64(req.End), nil)

	totalTSBuilder := sqlbuilder.NewSelectBuilder()
	totalTSBuilder.Select("uniq(fingerprint)")
	totalTSBuilder.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	totalTSBuilder.Where(totalTSBuilder.Between("unix_milli", start, end))
	totalTSBuilder.Where(totalTSBuilder.E("__normalized", false))

	metricsSB := sqlbuilder.NewSelectBuilder()
	metricsSB.Select(
		"metric_name",
		"uniq(fingerprint) AS total_value",
	)
	totalPlaceholder := metricsSB.Var(totalTSBuilder)
	metricsSB.SelectMore(fmt.Sprintf("(%s) AS total_time_series", totalPlaceholder))
	metricsSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTsTable))
	metricsSB.Where(metricsSB.Between("unix_milli", start, end))
	metricsSB.Where("NOT startsWith(metric_name, 'signoz')")
	metricsSB.Where(metricsSB.E("__normalized", false))
	if filterWhereClause != nil {
		metricsSB.WhereClause.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	metricsSB.GroupBy("metric_name")

	cteBuilder := sqlbuilder.With(
		sqlbuilder.CTEQuery("__metric_totals").As(metricsSB),
	)

	finalSB := cteBuilder.Select(
		"metric_name",
		"total_value",
		"CASE WHEN total_time_series = 0 THEN 0 ELSE (total_value * 100.0 / total_time_series) END AS percentage",
	)
	finalSB.From("__metric_totals")
	finalSB.OrderBy("percentage").Desc()
	finalSB.Limit(req.Limit)

	query, args := finalSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute timeseries treemap query")
	}
	defer rows.Close()

	entries := make([]metricsmoduletypes.TreemapEntry, 0)
	for rows.Next() {
		var treemapEntry metricsmoduletypes.TreemapEntry
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

func (m *module) computeSamplesTreemap(ctx context.Context, req *metricsmoduletypes.TreemapRequest, filterWhereClause *sqlbuilder.WhereClause) ([]metricsmoduletypes.TreemapEntry, error) {
	start, end, distributedTsTable, localTsTable := telemetrymetrics.WhichTSTableToUse(uint64(req.Start), uint64(req.End), nil)
	samplesTable, countExp := telemetrymetrics.WhichSamplesTableToUse(uint64(req.Start), uint64(req.End), metrictypes.UnspecifiedType, metrictypes.TimeAggregationUnspecified, nil)

	candidateLimit := req.Limit + 50

	metricCandidatesSB := sqlbuilder.NewSelectBuilder()
	metricCandidatesSB.Select("ts.metric_name")
	metricCandidatesSB.From(fmt.Sprintf("%s.%s AS ts", telemetrymetrics.DBName, distributedTsTable))
	metricCandidatesSB.Where("NOT startsWith(ts.metric_name, 'signoz')")
	metricCandidatesSB.Where(metricCandidatesSB.E("__normalized", false))
	metricCandidatesSB.Where(metricCandidatesSB.Between("unix_milli", start, end))
	if filterWhereClause != nil {
		metricCandidatesSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
	}
	metricCandidatesSB.GroupBy("ts.metric_name")
	metricCandidatesSB.OrderBy("uniq(ts.fingerprint) DESC")
	metricCandidatesSB.Limit(candidateLimit)

	totalSamplesSB := sqlbuilder.NewSelectBuilder()
	totalSamplesSB.Select(fmt.Sprintf("%s AS total_samples", countExp))
	totalSamplesSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, samplesTable))
	totalSamplesSB.Where(totalSamplesSB.Between("unix_milli", req.Start, req.End))

	sampleCountsSB := sqlbuilder.NewSelectBuilder()
	sampleCountsSB.Select(
		"dm.metric_name AS metric_name",
		fmt.Sprintf("%s AS samples", countExp),
	)
	sampleCountsSB.From(fmt.Sprintf("%s.%s AS dm", telemetrymetrics.DBName, samplesTable))
	sampleCountsSB.Where(sampleCountsSB.Between("dm.unix_milli", req.Start, req.End))
	sampleCountsSB.Where("dm.metric_name IN (SELECT metric_name FROM __metric_candidates)")

	if filterWhereClause != nil {
		fingerprintSB := sqlbuilder.NewSelectBuilder()
		fingerprintSB.Select("ts.fingerprint")
		fingerprintSB.From(fmt.Sprintf("%s.%s AS ts", telemetrymetrics.DBName, localTsTable))
		fingerprintSB.Where(fingerprintSB.Between("ts.unix_milli", start, end))
		fingerprintSB.Where("NOT startsWith(ts.metric_name, 'signoz')")
		fingerprintSB.Where(fingerprintSB.E("__normalized", false))
		fingerprintSB.AddWhereClause(sqlbuilder.CopyWhereClause(filterWhereClause))
		fingerprintSB.Where("ts.metric_name IN (SELECT metric_name FROM __metric_candidates)")
		fingerprintSB.GroupBy("ts.fingerprint")

		subQuery := sampleCountsSB.Var(fingerprintSB)
		sampleCountsSB.Where(fmt.Sprintf("dm.fingerprint IN (%s)", subQuery))
	}

	sampleCountsSB.GroupBy("dm.metric_name")

	cteBuilder := sqlbuilder.With(
		sqlbuilder.CTEQuery("__metric_candidates").As(metricCandidatesSB),
		sqlbuilder.CTEQuery("__sample_counts").As(sampleCountsSB),
		sqlbuilder.CTEQuery("__total_samples").As(totalSamplesSB),
	)

	finalSB := cteBuilder.Select(
		"mc.metric_name",
		"COALESCE(sc.samples, 0) AS samples",
		"CASE WHEN ts.total_samples = 0 THEN 0 ELSE (COALESCE(sc.samples, 0) * 100.0 / ts.total_samples) END AS percentage",
	)
	finalSB.From("__metric_candidates mc")
	finalSB.JoinWithOption(sqlbuilder.LeftJoin, "__sample_counts sc", "mc.metric_name = sc.metric_name")
	finalSB.Join("__total_samples ts", "1=1")
	finalSB.OrderBy("percentage DESC")
	finalSB.Limit(req.Limit)

	query, args := finalSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute samples treemap query")
	}
	defer rows.Close()

	entries := make([]metricsmoduletypes.TreemapEntry, 0)
	for rows.Next() {
		var treemapEntry metricsmoduletypes.TreemapEntry
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

func (m *module) GetMetricAttributes(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.MetricAttributesRequest) (*metricsmoduletypes.MetricAttributesResponse, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.MetricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metric_name is required")
	}

	var args []any
	args = append(args, req.MetricName)

	// Add time range filtering if provided
	timeFilter := ""
	if req.Start > 0 && req.End > 0 {
		// Filter by time range using first_reported_unix_milli and last_reported_unix_milli
		// We want attributes that were active during this time range
		timeFilter = " AND (last_reported_unix_milli >= ? AND first_reported_unix_milli <= ?)"
		args = append(args, req.Start, req.End)
	}

	// Query the metadata table
	// We use FINAL to ensure we get the aggregated results from AggregatingMergeTree
	query := fmt.Sprintf(`
		SELECT 
			attr_name AS key,
			groupUniqArray(1000)(attr_string_value) AS values,
			count(DISTINCT attr_string_value) AS valueCount
		FROM %s.%s FINAL
		WHERE metric_name = ? 
		AND NOT startsWith(attr_name, '__')
		%s
		GROUP BY attr_name
		ORDER BY valueCount DESC;`,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		timeFilter)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch metric attributes")
	}
	defer rows.Close()

	attributes := make([]metricsmoduletypes.MetricAttribute, 0)
	for rows.Next() {
		var attr metricsmoduletypes.MetricAttribute
		if err := rows.Scan(&attr.Key, &attr.Value, &attr.ValueCount); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan metric attribute row")
		}
		attributes = append(attributes, attr)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating metric attribute rows")
	}

	return &metricsmoduletypes.MetricAttributesResponse{
		Attributes: attributes,
	}, nil
}
