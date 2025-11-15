package implmetricsmodule

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/metricsmodule"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	fieldMapper            qbtypes.FieldMapper
	condBuilder            qbtypes.ConditionBuilder
	logger                 *slog.Logger
	telemetryMetadataStore telemetrytypes.MetadataStore
}

// NewModule constructs the metrics module with the provided dependencies.
func NewModule(ts telemetrystore.TelemetryStore, providerSettings factory.ProviderSettings) metricsmodule.Module {
	// TODO(nikhilmantri0902, srikanthccv): the three following dependencies are they rightly getting passed
	// basically is this a good design. Alternatively, we can also take telemetrymetadatastore from newModules
	// where all the modules are initialized, but there also this will be needed as today its not initialized there.
	telemetryMetadataStore := telemetrymetadata.NewTelemetryMetaStore(
		providerSettings,
		ts,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanAttributesKeysTblName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrymeter.DBName,
		telemetrymeter.SamplesAgg1dTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrylogs.LogAttributeKeysTblName,
		telemetrylogs.LogResourceKeysTblName,
		telemetrymetadata.DBName,
		telemetrymetadata.AttributesMetadataLocalTableName,
	)
	fieldMapper := telemetrymetrics.NewFieldMapper()
	condBuilder := telemetrymetrics.NewConditionBuilder(fieldMapper)
	return &module{
		telemetryStore:         ts,
		fieldMapper:            fieldMapper,
		condBuilder:            condBuilder,
		logger:                 providerSettings.Logger,
		telemetryMetadataStore: telemetryMetadataStore,
	}
}

func (m *module) buildFilterClause(ctx context.Context, expression string, startMillis, endMillis int64) (string, []any, error) {
	expression = strings.TrimSpace(expression)
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
	whereClauseString = strings.TrimPrefix(whereClauseString, "WHERE")
	whereClauseString = strings.TrimSpace(whereClauseString)

	return whereClauseString, args, nil
}

func (m *module) GetStats(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.StatsRequest) (*metricsmoduletypes.StatsResponse, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Start <= 0 || req.End <= 0 || req.Start >= req.End {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid time range")
	}

	if req.Limit < 1 || req.Limit > 5000 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}

	if req.Offset < 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "offset cannot be negative")
	}

	orderCfg, err := resolveOrderBy(req.OrderBy)
	if err != nil {
		return nil, err
	}

	filterSQL, filterArgs, err := m.buildFilterClause(ctx, req.Expression, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	// TODO(nikhilmantri0902): even the fetch samples coubt function below relies on these
	//values, is it okay to recalculate them there in the function itself?
	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	statsQuery := fmt.Sprintf(`
		SELECT
			t.metric_name AS metric_name,
			ANY_VALUE(t.description) AS description,
			ANY_VALUE(t.type) AS metric_type,
			ANY_VALUE(t.unit) AS metric_unit,
			uniq(t.fingerprint) AS timeseries,
			max(t.unix_milli) AS lastReceived,
			uniq(metric_name) OVER() AS total
		FROM %s.%s AS t
		WHERE unix_milli BETWEEN ? AND ?
		AND NOT startsWith(metric_name, 'signoz')
		AND __normalized = ?
		AND (%s)
		GROUP BY t.metric_name
		ORDER BY %s %s
		LIMIT ? OFFSET ?`,
		metricDatabaseName, tsTable,
		filterSQL,
		orderCfg.sqlColumn, orderCfg.direction,
	)

	args := make([]any, 0, 4+len(filterArgs))
	args = append(args, start, end, normalized)
	args = append(args, filterArgs...)
	args = append(args, req.Limit, req.Offset)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, statsQuery, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute metrics stats query")
	}
	defer rows.Close()

	resp := &metricsmoduletypes.StatsResponse{
		Metrics: make([]metricsmoduletypes.MetricStat, 0),
	}

	var (
		total       uint64
		metricNames []string
	)

	for rows.Next() {
		var (
			metricName   string
			description  string
			metricType   string
			metricUnit   string
			timeseries   uint64
			lastReceived int64
			rowTotal     uint64
		)

		if err := rows.Scan(&metricName, &description, &metricType, &metricUnit, &timeseries, &lastReceived, &rowTotal); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan metrics stats row")
		}

		resp.Metrics = append(resp.Metrics, metricsmoduletypes.MetricStat{
			MetricName:   metricName,
			Description:  description,
			MetricType:   metricType,
			MetricUnit:   metricUnit,
			TimeSeries:   timeseries,
			LastReceived: lastReceived,
		})

		metricNames = append(metricNames, metricName)
		total = rowTotal
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating metrics stats rows")
	}

	if len(metricNames) == 0 {
		resp.Total = 0
		return resp, nil
	}

	sampleMap, err := m.fetchSampleCounts(ctx, metricNames, req, orderCfg.orderBySamples, orderCfg.direction, filterSQL, filterArgs, normalized)
	if err != nil {
		return nil, err
	}

	meta, err := m.GetUpdatedMetricsMetadata(ctx, orgID, metricNames...)
	if err != nil {
		return nil, err
	}

	filtered := make([]metricsmoduletypes.MetricStat, 0, len(resp.Metrics))
	for i := range resp.Metrics {
		stat := resp.Metrics[i]
		if updated, ok := meta[stat.MetricName]; ok {
			if updated.MetricType != "" {
				stat.MetricType = updated.MetricType
			}
			if updated.MetricUnit != "" {
				stat.MetricUnit = updated.MetricUnit
			}
			if updated.Description != "" {
				stat.Description = updated.Description
			}
		}
		if samples, ok := sampleMap[stat.MetricName]; ok {
			stat.Samples = samples
			filtered = append(filtered, stat)
		}
	}
	resp.Metrics = filtered

	if orderCfg.orderBySamples {
		sort.Slice(resp.Metrics, func(i, j int) bool {
			if orderCfg.direction == OrderByDirectionAsc {
				return resp.Metrics[i].Samples < resp.Metrics[j].Samples
			}
			return resp.Metrics[i].Samples > resp.Metrics[j].Samples
		})
	}

	resp.Total = total
	return resp, nil
}

func (m *module) fetchSampleCounts(
	ctx context.Context,
	metricNames []string,
	req *metricsmoduletypes.StatsRequest,
	orderBySamples bool,
	orderDirection string,
	filterSQL string,
	filterArgs []any,
	normalized bool,
) (map[string]uint64, error) {

	start, end, _, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	samplesTable, countExp := utils.WhichSampleTableToUse(req.Start, req.End)

	metricPlaceholders := strings.TrimRight(strings.Repeat("?,", len(metricNames)), ",")
	var (
		queryBuilder strings.Builder
		args         []any
	)

	if filterSQL != defaultFilterConditionTrue {
		queryBuilder.WriteString(fmt.Sprintf(
			`SELECT 
				s.samples,
				s.metric_name
			FROM (
				SELECT 
					dm.metric_name,
					%s AS samples
				FROM %s.%s AS dm
				WHERE dm.metric_name IN (%s)
				AND dm.fingerprint IN (
					SELECT fingerprint
					FROM %s.%s
					WHERE metric_name IN (%s)
					AND __normalized = ?
					AND unix_milli BETWEEN ? AND ?
					AND (%s)
					GROUP BY fingerprint
				)
				AND dm.unix_milli BETWEEN ? AND ?
				GROUP BY dm.metric_name
			) AS s`,
			countExp,
			metricDatabaseName, samplesTable,
			metricPlaceholders,
			metricDatabaseName, localTsTable,
			metricPlaceholders,
			filterSQL,
		))
		for _, name := range metricNames {
			args = append(args, name)
		}
		for _, name := range metricNames {
			args = append(args, name)
		}
		args = append(args, normalized)
		args = append(args, start, end)
		args = append(args, filterArgs...)
		args = append(args, req.Start, req.End)
	} else {
		queryBuilder.WriteString(fmt.Sprintf(
			`SELECT 
				s.samples,
				s.metric_name
			FROM (
				SELECT 
					metric_name,
					%s AS samples
				FROM %s.%s
				WHERE metric_name IN (%s)
				AND unix_milli BETWEEN ? AND ?
				GROUP BY metric_name
			) AS s`,
			countExp,
			metricDatabaseName, samplesTable,
			metricPlaceholders,
		))
		for _, name := range metricNames {
			args = append(args, name)
		}
		args = append(args, req.Start, req.End)
	}

	if orderBySamples {
		queryBuilder.WriteString(fmt.Sprintf(" ORDER BY s.samples %s", orderDirection))
	}

	queryBuilder.WriteString(" LIMIT ?;")
	args = append(args, req.Limit)

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, queryBuilder.String(), args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute metrics samples query")
	}
	defer rows.Close()

	sampleMap := make(map[string]uint64, len(metricNames))
	for rows.Next() {
		var (
			count      uint64
			metricName string
		)
		if err := rows.Scan(&count, &metricName); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan metrics samples row")
		}
		sampleMap[metricName] = count
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating metrics samples rows")
	}

	return sampleMap, nil
}

func (m *module) computeTimeseriesTreemap(ctx context.Context, req *metricsmoduletypes.TreemapRequest, filterSQL string, filterArgs []any) ([]metricsmoduletypes.TreemapEntry, error) {
	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

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
		metricDatabaseName,
		tsTable,
		metricDatabaseName,
		tsTable,
		filterClause,
	)

	args := make([]any, 0, 6+2*len(filterArgs))
	args = append(args, start, end, normalized)
	args = append(args, start, end, normalized)
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
			name       string
			totalValue uint64
			percentage float64
		)
		if err := rows.Scan(&name, &totalValue, &percentage); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan timeseries treemap row")
		}
		entries = append(entries, metricsmoduletypes.TreemapEntry{
			MetricName: name,
			TotalValue: totalValue,
			Percentage: percentage,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating timeseries treemap rows")
	}

	return entries, nil
}

func (m *module) computeSamplesTreemap(ctx context.Context, req *metricsmoduletypes.TreemapRequest, filterSQL string, filterArgs []any) ([]metricsmoduletypes.TreemapEntry, error) {
	start, end, tsTable, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	sampleTable, countExpr := utils.WhichSampleTableToUse(req.Start, req.End)

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

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
		metricDatabaseName, tsTable, filterClause, queryLimit)

	args := make([]any, 0, 3+len(filterArgs))
	args = append(args, normalized, start, end)
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
			name       string
			timeSeries uint64
		)
		if err := rows.Scan(&name, &timeSeries); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan samples treemap pre-query row")
		}
		metricNames = append(metricNames, name)
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
			AND dm.metric_name IN (%s)`,
		countExpr, metricDatabaseName, sampleTable,
		countExpr, metricDatabaseName, sampleTable, metricPlaceholders,
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
			metricDatabaseName, localTsTable, metricPlaceholdersSub, filterSQL,
		))

		for _, name := range metricNames {
			sampleArgs = append(sampleArgs, name)
		}
		sampleArgs = append(sampleArgs, start, end, normalized)
		sampleArgs = append(sampleArgs, filterArgs...)
	}

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
			name       string
			value      uint64
			percentage float64
		)
		if err := rows.Scan(&name, &value, &percentage); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan samples treemap row")
		}
		entries = append(entries, metricsmoduletypes.TreemapEntry{
			MetricName: name,
			TotalValue: value,
			Percentage: percentage,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating samples treemap rows")
	}

	return entries, nil
}

// GetTreemap will return metrics treemap information once implemented.
func (m *module) GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.TreemapRequest) (*metricsmoduletypes.TreemapResponse, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Start <= 0 || req.End <= 0 || req.Start >= req.End {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid time range")
	}

	if req.Limit < 1 || req.Limit > 5000 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}

	if req.Treemap != metricsmoduletypes.TreemapModeSamples && req.Treemap != metricsmoduletypes.TreemapModeTimeSeries {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid treemap mode")
	}

	filterSQL, filterArgs, err := m.buildFilterClause(ctx, req.Expression, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	resp := &metricsmoduletypes.TreemapResponse{}
	switch req.Treemap {
	case metricsmoduletypes.TreemapModeSamples:
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

func (m *module) GetUpdatedMetricsMetadata(ctx context.Context, orgID valuer.UUID, metricNames ...string) (map[string]*metricsmoduletypes.MetricMetadata, error) {
	if len(metricNames) == 0 {
		return map[string]*metricsmoduletypes.MetricMetadata{}, nil
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(metricNames)), ",")
	// TODO(nikhilmantri0902): move table names to constants
	query := fmt.Sprintf(`SELECT metric_name, description, type, unit FROM %s.%s WHERE metric_name IN (%s)`,
		metricDatabaseName, distributedUpdatedMetadataTableName, placeholders)

	args := make([]any, len(metricNames))
	for i := range metricNames {
		args[i] = metricNames[i]
	}

	db := m.telemetryStore.ClickhouseDB()
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch updated metrics metadata")
	}
	defer rows.Close()

	meta := make(map[string]*metricsmoduletypes.MetricMetadata, len(metricNames))
	for rows.Next() {
		var (
			name        string
			description string
			metricType  string
			unit        string
		)

		if err := rows.Scan(&name, &description, &metricType, &unit); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan updated metrics metadata")
		}

		meta[name] = &metricsmoduletypes.MetricMetadata{
			Description: description,
			MetricType:  metricType,
			MetricUnit:  unit,
		}
	}

	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error iterating updated metrics metadata rows")
	}

	return meta, nil
}
