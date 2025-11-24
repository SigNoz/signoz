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
	"github.com/SigNoz/signoz/pkg/query-service/utils"
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

	filterSQL, filterArgs, err := m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	// Single query to get stats with samples, timeseries counts in required sorting order
	metricStats, total, err := m.fetchMetricsStatsWithSamples(
		ctx,
		req,
		filterSQL,
		filterArgs,
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

	metadata, err := m.GetMetricsMetadataMulti(ctx, orgID, metricNames)
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

	filterSQL, filterArgs, err := m.buildFilterClause(ctx, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	resp := &metricsmoduletypes.TreemapResponse{}
	switch req.Treemap {
	case metrictypes.TreemapModeSamples:
		entries, err := m.computeSamplesTreemap(ctx, req, filterSQL, filterArgs)
		if err != nil {
			return nil, err
		}
		resp.Samples = entries
	default: // TreemapModeTimeSeries
		entries, err := m.computeTimeseriesTreemap(ctx, req, filterSQL, filterArgs)
		if err != nil {
			return nil, err
		}
		resp.TimeSeries = entries
	}

	return resp, nil
}

func (m *module) GetMetricsMetadataMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsmoduletypes.MetricMetadata, error) {
	if len(metricNames) == 0 {
		return map[string]*metricsmoduletypes.MetricMetadata{}, nil
	}

	metadata := make(map[string]*metricsmoduletypes.MetricMetadata)
	cacheMisses := make([]string, 0)

	// Try to get from cache first
	for _, metricName := range metricNames {
		cacheKey := generateMetricMetadataCacheKey(metricName)
		var cachedMetadata metricsmoduletypes.MetricMetadata
		err := m.cache.Get(ctx, orgID, cacheKey, &cachedMetadata)
		if err == nil {
			// Cache hit
			metadata[metricName] = &cachedMetadata
		} else {
			// Cache miss - log warning but continue
			m.logger.WarnContext(ctx, "cache miss for metric metadata", "metric_name", metricName, "error", err)
			cacheMisses = append(cacheMisses, metricName)
		}
	}

	// If all metrics were found in cache, return early
	if len(cacheMisses) == 0 {
		return metadata, nil
	}

	// Query updated_metadata table for cache misses
	foundInUpdatedMetadata := make(map[string]bool)
	if len(cacheMisses) > 0 {
		args := make([]any, len(cacheMisses))
		for i := range cacheMisses {
			args[i] = cacheMisses[i]
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

		for rows.Next() {
			var (
				metricMetadata metricsmoduletypes.MetricMetadata
				metricName     string
				dbMetricType   string
				dbTemporality  string
			)

			if err := rows.Scan(&metricName, &metricMetadata.Description, &dbMetricType, &metricMetadata.MetricUnit, &dbTemporality, &metricMetadata.IsMonotonic); err != nil {
				return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan updated metrics metadata")
			}

			metricMetadata.MetricType = convertDBFormatToMetricType(dbMetricType)
			metricMetadata.Temporality = convertDBFormatToTemporality(dbTemporality)
			metadata[metricName] = &metricMetadata
			foundInUpdatedMetadata[metricName] = true

			// Set in cache after successful DB fetch
			cacheKey := generateMetricMetadataCacheKey(metricName)
			if err := m.cache.Set(ctx, orgID, cacheKey, &metricMetadata, 0); err != nil {
				m.logger.WarnContext(ctx, "failed to set metric metadata in cache", "metric_name", metricName, "error", err)
			}
		}

		if err := rows.Err(); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating updated metrics metadata rows")
		}
	}

	// Query timeseries table for metrics not found in updated_metadata
	cacheAndUpdatedMetadataMisses := make([]string, 0)
	for _, metricName := range cacheMisses {
		if !foundInUpdatedMetadata[metricName] {
			cacheAndUpdatedMetadataMisses = append(cacheAndUpdatedMetadataMisses, metricName)
		}
	}

	if len(cacheAndUpdatedMetadataMisses) > 0 {
		args := make([]any, len(cacheAndUpdatedMetadataMisses))
		for i := range cacheAndUpdatedMetadataMisses {
			args[i] = cacheAndUpdatedMetadataMisses[i]
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

		for rows.Next() {
			var (
				metricMetadata metricsmoduletypes.MetricMetadata
				metricName     string
				dbMetricType   string
				dbTemporality  string
			)

			if err := rows.Scan(&metricName, &metricMetadata.Description, &dbMetricType, &metricMetadata.MetricUnit, &dbTemporality, &metricMetadata.IsMonotonic); err != nil {
				return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan timeseries metadata")
			}

			metricMetadata.MetricType = convertDBFormatToMetricType(dbMetricType)
			metricMetadata.Temporality = convertDBFormatToTemporality(dbTemporality)
			metadata[metricName] = &metricMetadata

			// Set in cache after successful DB fetch
			cacheKey := generateMetricMetadataCacheKey(metricName)
			if err := m.cache.Set(ctx, orgID, cacheKey, &metricMetadata, 0); err != nil {
				m.logger.WarnContext(ctx, "failed to set metric metadata in cache", "metric_name", metricName, "error", err)
			}
		}

		if err := rows.Err(); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating timeseries metadata rows")
		}
	}

	return metadata, nil
}

func (m *module) UpdateMetricsMetadata(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.UpdateMetricsMetadataRequest) error {
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

func (m *module) validateAndNormalizeMetricType(req *metricsmoduletypes.UpdateMetricsMetadataRequest) error {
	switch req.MetricType {
	case metrictypes.SumType:
		if req.Temporality.IsZero() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "temporality is required when metric type is Sum")
		}
		if req.Temporality != metrictypes.Delta && req.Temporality != metrictypes.Cumulative {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid value for temporality")
		}
		// Special case: if Sum is not monotonic and cumulative, convert to Gauge
		if !req.IsMonotonic && req.Temporality == metrictypes.Cumulative {
			req.MetricType = metrictypes.GaugeType
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

func (m *module) validateMetricLabels(ctx context.Context, req *metricsmoduletypes.UpdateMetricsMetadataRequest) error {
	if req.MetricType == metrictypes.HistogramType {
		labels := []string{"le"}
		hasLabels, err := m.checkForLabelsInMetric(ctx, req.MetricName, labels)
		if err != nil {
			return err
		}
		if !hasLabels {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric '%s' cannot be set as histogram type", req.MetricName)
		}
	}

	if req.MetricType == metrictypes.SummaryType {
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

func (m *module) insertMetricsMetadata(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.UpdateMetricsMetadataRequest) error {
	createdAt := time.Now().UnixMilli()

	ib := sqlbuilder.NewInsertBuilder()
	ib.InsertInto(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.UpdatedMetadataTableName))
	ib.Cols("metric_name", "temporality", "is_monotonic", "type", "description", "unit", "created_at")
	ib.Values(
		req.MetricName,
		convertTemporalityToDBFormat(req.Temporality),
		req.IsMonotonic,
		convertMetricTypeToDBFormat(req.MetricType),
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
		MetricType:  req.MetricType,
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

func (m *module) buildFilterClause(ctx context.Context, filter *qbtypes.Filter, startMillis, endMillis int64) (string, []any, error) {
	expression := ""
	if filter != nil {
		expression = strings.TrimSpace(filter.Expression)
	}
	if expression == "" {
		return defaultFilterConditionTrue, nil, nil
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
		return "", nil, err
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
		return "", nil, err
	}

	if whereClause == nil || whereClause.WhereClause == nil {
		return defaultFilterConditionTrue, nil, nil
	}

	whereClauseString, args := whereClause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
	// Remove "WHERE" (case sensitive) from the start of sql string, if present
	whereClauseString = strings.TrimSpace(whereClauseString)
	whereClauseString = strings.TrimPrefix(whereClauseString, sqlKeyWordWhere)
	whereClauseString = strings.TrimSpace(whereClauseString)

	return whereClauseString, args, nil
}

func (m *module) fetchMetricsStatsWithSamples(
	ctx context.Context,
	req *metricsmoduletypes.StatsRequest,
	filterSQL string,
	filterArgs []any,
	normalized bool,
	orderBy *qbtypes.OrderBy,
) ([]metricsmoduletypes.Stat, uint64, error) {

	start, end, tsTable, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	samplesTable, countExp := utils.WhichSampleTableToUse(req.Start, req.End)

	var queryBuilder strings.Builder
	var args []any

	// Build samples subquery
	samplesSubquery := fmt.Sprintf(`
		SELECT 
			dm.metric_name,
			%s AS samples
		FROM %s.%s AS dm
		WHERE dm.unix_milli BETWEEN ? AND ?
		AND NOT startsWith(dm.metric_name, 'signoz')`,
		countExp,
		telemetrymetrics.DBName, samplesTable,
	)

	// Add fingerprint filtering if filterSQL is not default
	if filterSQL != defaultFilterConditionTrue {
		samplesSubquery += fmt.Sprintf(`
		AND dm.fingerprint IN (
			SELECT fingerprint
			FROM %s.%s
			WHERE unix_milli BETWEEN ? AND ?
			AND NOT startsWith(metric_name, 'signoz')
			AND __normalized = ?
			AND (%s)
			GROUP BY fingerprint
		)`,
			telemetrymetrics.DBName, localTsTable, filterSQL,
		)
	}

	samplesSubquery += `
		GROUP BY dm.metric_name`

	// Build main query with FULL OUTER JOIN
	queryBuilder.WriteString(fmt.Sprintf(`
		SELECT 
			COALESCE(ts.metric_name, s.metric_name) AS metric_name,
			COALESCE(ts.timeseries, 0) AS timeseries,
			COALESCE(s.samples, 0) AS samples,
			COUNT(*) OVER() AS total
		FROM (
			SELECT 
				metric_name,
				uniq(fingerprint) AS timeseries
			FROM %s.%s
			WHERE unix_milli BETWEEN ? AND ?
			AND NOT startsWith(metric_name, 'signoz')
			AND __normalized = ?
			AND (%s)
			GROUP BY metric_name
		) AS ts
		FULL OUTER JOIN (
			%s
		) AS s ON ts.metric_name = s.metric_name
		WHERE (ts.timeseries > 0 OR s.samples > 0)`,
		telemetrymetrics.DBName, tsTable, filterSQL, samplesSubquery,
	))

	// Build args in correct order: timeseries subquery first, then samples subquery
	// Timeseries subquery args
	args = append(args, start, end, normalized)
	args = append(args, filterArgs...)

	// Samples subquery args
	args = append(args, req.Start, req.End)
	if filterSQL != defaultFilterConditionTrue {
		args = append(args, start, end, normalized)
		args = append(args, filterArgs...)
	}

	orderByColumn, orderDirection, err := getStatsOrderByColumn(orderBy)
	if err != nil {
		return nil, 0, err
	}

	// Add ORDER BY clause
	queryBuilder.WriteString(fmt.Sprintf(`
		ORDER BY %s %s, metric_name ASC
		LIMIT ? OFFSET ?`,
		orderByColumn, orderDirection,
	))

	args = append(args, req.Limit, req.Offset)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, queryBuilder.String(), args...)
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

func (m *module) computeTimeseriesTreemap(ctx context.Context, req *metricsmoduletypes.TreemapRequest, filterSQL string, filterArgs []any) ([]metricsmoduletypes.TreemapEntry, error) {
	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)

	filterClause := ""
	if filterSQL != defaultFilterConditionTrue {
		filterClause = fmt.Sprintf(" AND (%s)", filterSQL)
	}

	query := fmt.Sprintf(`
		SELECT
			metric_name,
			total_value,
			(total_value * 100.0 / total_time_series) AS percentage
		FROM (
			SELECT
				metric_name,
				uniq(fingerprint) AS total_value,
				(SELECT uniq(fingerprint)
					FROM %s.%s
					WHERE unix_milli BETWEEN ? AND ?
					AND __normalized = ?) AS total_time_series
			FROM %s.%s
			WHERE unix_milli BETWEEN ? AND ?
			AND NOT startsWith(metric_name, 'signoz')
			AND __normalized = ?
			%s
			GROUP BY metric_name
		)
		ORDER BY percentage DESC
		LIMIT ?;`,
		telemetrymetrics.DBName,
		tsTable,
		telemetrymetrics.DBName,
		tsTable,
		filterClause,
	)

	args := make([]any, 0, 6+2*len(filterArgs))
	args = append(args, start, end, false)
	args = append(args, start, end, false)
	if filterClause != "" {
		args = append(args, filterArgs...)
	}
	args = append(args, req.Limit)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute timeseries treemap query")
	}
	defer rows.Close()

	entries := make([]metricsmoduletypes.TreemapEntry, 0)
	for rows.Next() {
		var (
			treemapEntry metricsmoduletypes.TreemapEntry
		)
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

func (m *module) computeSamplesTreemap(ctx context.Context, req *metricsmoduletypes.TreemapRequest, filterSQL string, filterArgs []any) ([]metricsmoduletypes.TreemapEntry, error) {
	start, end, tsTable, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	samplesTable, countExp := utils.WhichSampleTableToUse(req.Start, req.End)

	filterClause := ""
	if filterSQL != defaultFilterConditionTrue {
		filterClause = fmt.Sprintf(" AND (%s)", filterSQL)
	}

	queryLimit := req.Limit + 50
	metricsQuery := fmt.Sprintf(`
		SELECT
			ts.metric_name AS metric_name,
			uniq(ts.fingerprint) AS timeSeries
		FROM %s.%s AS ts
		WHERE NOT startsWith(ts.metric_name, 'signoz')
		AND __normalized = ?
		AND unix_milli BETWEEN ? AND ?
		%s
		GROUP BY ts.metric_name
		ORDER BY timeSeries DESC
		LIMIT %d;`,
		telemetrymetrics.DBName, tsTable, filterClause, queryLimit)

	args := make([]any, 0, 3+len(filterArgs))
	args = append(args, false, start, end)
	if filterClause != "" {
		args = append(args, filterArgs...)
	}

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, metricsQuery, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute samples treemap pre-query")
	}
	defer rows.Close()

	metricNames := make([]string, 0)
	for rows.Next() {
		var (
			metricName string
			timeSeries uint64
		)
		if err := rows.Scan(&metricName, &timeSeries); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan samples treemap pre-query row")
		}
		metricNames = append(metricNames, metricName)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating samples treemap pre-query rows")
	}

	if len(metricNames) == 0 {
		return []metricsmoduletypes.TreemapEntry{}, nil
	}

	metricPlaceholders := strings.TrimRight(strings.Repeat("?,", len(metricNames)), ",")
	var (
		queryBuilder strings.Builder
		sampleArgs   []any
	)

	queryBuilder.WriteString(fmt.Sprintf(`
		WITH TotalSamples AS (
			SELECT %s AS total_samples
			FROM %s.%s
			WHERE unix_milli BETWEEN ? AND ?
		),
		Samples AS (
			SELECT
				dm.metric_name,
				%s AS samples
			FROM %s.%s AS dm
			WHERE dm.unix_milli BETWEEN ? AND ?
			AND dm.metric_name IN (%s) `,
		countExp, telemetrymetrics.DBName, samplesTable,
		countExp, telemetrymetrics.DBName, samplesTable, metricPlaceholders,
	))

	sampleArgs = append(sampleArgs, req.Start, req.End)
	sampleArgs = append(sampleArgs, req.Start, req.End)
	for _, name := range metricNames {
		sampleArgs = append(sampleArgs, name)
	}

	if filterSQL != defaultFilterConditionTrue {
		metricPlaceholdersSub := strings.TrimRight(strings.Repeat("?,", len(metricNames)), ",")
		queryBuilder.WriteString(fmt.Sprintf(`
			AND dm.fingerprint IN (
				SELECT ts.fingerprint
				FROM %s.%s AS ts
				WHERE ts.metric_name IN (%s)
				AND unix_milli BETWEEN ? AND ?
				AND NOT startsWith(ts.metric_name, 'signoz')
				AND __normalized = ?
				AND (%s)
				GROUP BY ts.fingerprint
			)`,
			telemetrymetrics.DBName, localTsTable, metricPlaceholdersSub, filterSQL,
		))

		for _, name := range metricNames {
			sampleArgs = append(sampleArgs, name)
		}
		sampleArgs = append(sampleArgs, start, end, false)
		sampleArgs = append(sampleArgs, filterArgs...)
	}

	// TODO(nikhilmantri0902, srikanthccv): using cross join below instead of JOIN ON 1=1 like legacy. Is that fine?
	queryBuilder.WriteString(`
		GROUP BY dm.metric_name
			)
			SELECT
				s.metric_name,
				s.samples,
				CASE WHEN t.total_samples = 0 THEN 0 ELSE (s.samples * 100.0 / t.total_samples) END AS percentage
			FROM Samples s
			CROSS JOIN TotalSamples t
			ORDER BY percentage DESC
			LIMIT ?;`)

	sampleArgs = append(sampleArgs, req.Limit)

	rows, err = db.Query(ctx, queryBuilder.String(), sampleArgs...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute samples treemap query")
	}
	defer rows.Close()

	entries := make([]metricsmoduletypes.TreemapEntry, 0)
	for rows.Next() {
		var (
			treemapEntry metricsmoduletypes.TreemapEntry
		)
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
