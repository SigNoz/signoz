package implmetricsmodule

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/metricsmodule"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

type module struct {
	telemetryStore telemetrystore.TelemetryStore
	fieldMapper    qbtypes.FieldMapper
	condBuilder    qbtypes.ConditionBuilder
	logger         *slog.Logger
}

const metricDatabaseName = "signoz_metrics"

// NewModule constructs the metrics module with the provided dependencies.
func NewModule(ts telemetrystore.TelemetryStore) metricsmodule.Module {
	// TODO(nikhilmantri0902, srikanthccv): the three following dependencies are they rightly getting passed
	fieldMapper := telemetrymetrics.NewFieldMapper()
	condBuilder := telemetrymetrics.NewConditionBuilder(fieldMapper)
	logger := slog.Default()
	return &module{
		telemetryStore: ts,
		fieldMapper:    fieldMapper,
		condBuilder:    condBuilder,
		logger:         logger,
	}
}

func (m *module) buildFilterClause(expression string, startMillis, endMillis int64) (string, []any, error) {
	expression = strings.TrimSpace(expression)
	if expression == "" {
		return "true", nil, nil
	}

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           m.logger,
		FieldMapper:      m.fieldMapper,
		ConditionBuilder: m.condBuilder,
		// Metrics filters never rely on full text search columns.
		SkipFullTextFilter: true,
	}

	startNs := uint64(time.Duration(startMillis) * time.Millisecond)
	endNs := uint64(time.Duration(endMillis) * time.Millisecond)

	whereClause, err := querybuilder.PrepareWhereClause(expression, opts, startNs, endNs)
	if err != nil {
		return "", nil, err
	}

	if whereClause == nil || whereClause.WhereClause == nil {
		return "true", nil, nil
	}

	sql, args := whereClause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, nil
}

type orderConfig struct {
	sqlColumn      string
	direction      string
	orderBySamples bool
}

func resolveOrderBy(order *metricsmoduletypes.OrderBy) (orderConfig, error) {
	cfg := orderConfig{
		sqlColumn:      "timeseries",
		direction:      "DESC",
		orderBySamples: false,
	}

	if order == nil {
		return cfg, nil
	}

	switch strings.ToLower(order.ColumnName) {
	case "", "timeseries":
		cfg.sqlColumn = "timeseries"
	case "samples":
		cfg.orderBySamples = true
		cfg.sqlColumn = "timeseries" // defer true ordering until samples computed
	case "metricname", "metric_name":
		cfg.sqlColumn = "metric_name"
	case "lastreceived", "last_received":
		cfg.sqlColumn = "lastReceived"
	default:
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", order.ColumnName)
	}

	if order.Order != "" {
		switch strings.ToUpper(order.Order) {
		case "ASC":
			cfg.direction = "ASC"
		case "DESC":
			cfg.direction = "DESC"
		default:
			return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q", order.Order)
		}
	}

	return cfg, nil
}

func (m *module) GetStats(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.StatsRequest) (*metricsmoduletypes.StatsResponse, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Start <= 0 || req.End <= 0 || req.Start >= req.End {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid time range")
	}

	// TODO(nikhilmantri0902): limit upper cap?
	if req.Limit <= 0 {
		req.Limit = 10
	}

	if req.Offset < 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "offset cannot be negative")
	}

	orderCfg, err := resolveOrderBy(req.OrderBy)
	if err != nil {
		return nil, err
	}

	filterSQL, filterArgs, err := m.buildFilterClause(req.Expression, req.Start, req.End)
	if err != nil {
		return nil, err
	}

	start, end, tsTable, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	sampleTable, countExp := utils.WhichSampleTableToUse(req.Start, req.End)

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

	sampleMap, err := m.fetchSampleCounts(ctx, metricNames, req, orderCfg.orderBySamples, orderCfg.direction, sampleTable, localTsTable, countExp, filterSQL, filterArgs, normalized, start, end)
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
			if orderCfg.direction == "ASC" {
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
	sampleTable string,
	localTsTable string,
	countExpr string,
	filterSQL string,
	filterArgs []any,
	normalized bool,
	start int64,
	end int64,
) (map[string]uint64, error) {
	metricPlaceholders := strings.TrimRight(strings.Repeat("?,", len(metricNames)), ",")

	var (
		queryBuilder strings.Builder
		args         []any
	)

	if filterSQL != "true" {
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
			countExpr,
			metricDatabaseName, sampleTable,
			metricPlaceholders,
			metricDatabaseName, localTsTable,
			metricPlaceholders,
			filterSQL,
		))

		args = append(args,
			normalized,
			start, end,
		)
		args = append(args, filterArgs...)
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
			countExpr,
			metricDatabaseName, sampleTable,
			metricPlaceholders,
		))
	}

	if orderBySamples {
		queryBuilder.WriteString(fmt.Sprintf(" ORDER BY s.samples %s", orderDirection))
	}

	queryBuilder.WriteString(" LIMIT ?;")

	for _, name := range metricNames {
		args = append(args, name)
	}
	if filterSQL != "true" {
		for _, name := range metricNames {
			args = append(args, name)
		}
	}
	args = append(args, req.Start, req.End, req.Limit)

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

// GetTreemap will return metrics treemap information once implemented.
func (m *module) GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.TreemapRequest) (*metricsmoduletypes.TreemapResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "metrics treemap not implemented yet")
}

func (m *module) GetUpdatedMetricsMetadata(ctx context.Context, orgID valuer.UUID, metricNames ...string) (map[string]*metricsmoduletypes.MetricMetadata, error) {
	if len(metricNames) == 0 {
		return map[string]*metricsmoduletypes.MetricMetadata{}, nil
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(metricNames)), ",")
	// TODO(nikhilmantri0902): move table names to constants
	query := fmt.Sprintf(`SELECT metric_name, description, type, unit FROM %s.%s WHERE metric_name IN (%s)`,
		constants.SIGNOZ_METRIC_DBNAME, "distributed_updated_metadata", placeholders)

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
