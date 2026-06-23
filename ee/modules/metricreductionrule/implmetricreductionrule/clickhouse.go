package implmetricreductionrule

import (
	"context"
	"time"

	sqlbuilder "github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

var (
	reductionRulesTable = telemetrymetrics.DBName + "." + telemetrymetrics.ReductionRulesTableName
	metadataTable       = telemetrymetrics.DBName + "." + telemetrymetrics.AttributesMetadataTableName
	timeseriesTable     = telemetrymetrics.DBName + "." + telemetrymetrics.TimeseriesV4TableName
)

type clickhouse struct {
	telemetryStore telemetrystore.TelemetryStore
	threads        int
}

func newClickhouse(telemetryStore telemetrystore.TelemetryStore, threads int) *clickhouse {
	return &clickhouse{telemetryStore: telemetryStore, threads: threads}
}

func (c *clickhouse) withThreads(ctx context.Context) context.Context {
	return ctxtypes.SetClickhouseMaxThreads(ctx, c.threads)
}

const timeSeriesBucketMilli = int64(time.Hour / time.Millisecond)

// floorToTimeSeriesBucket rounds the start down to the hour, since unix_milli is hour-bucketed.
func floorToTimeSeriesBucket(ms int64) int64 {
	return ms - (ms % timeSeriesBucketMilli)
}

func (c *clickhouse) Sync(ctx context.Context, metricName string, labels []string, matchType string, effectiveFromMs int64, deleted bool, updatedAt time.Time) error {
	ctx = c.withThreads(ctx)

	ib := sqlbuilder.NewInsertBuilder()
	ib.InsertInto(reductionRulesTable)
	ib.Cols("metric_name", "labels", "match_type", "effective_from_unix_milli", "deleted", "updated_at")
	ib.Values(metricName, labels, matchType, effectiveFromMs, deleted, updatedAt)

	query, args := ib.BuildWithFlavor(sqlbuilder.ClickHouse)
	if err := c.telemetryStore.ClickhouseDB().Exec(ctx, query, args...); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to sync reduction rule to clickhouse")
	}
	return nil
}

func (c *clickhouse) MetricExists(ctx context.Context, metricName string) (bool, error) {
	ctx = c.withThreads(ctx)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*) > 0")
	sb.From(metadataTable)
	sb.Where(sb.E("metric_name", metricName))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var exists bool
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&exists); err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to check metric existence")
	}
	return exists, nil
}

func (c *clickhouse) IsExponentialHistogram(ctx context.Context, metricName string) (bool, error) {
	ctx = c.withThreads(ctx)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*) > 0")
	sb.From(timeseriesTable)
	sb.Where(sb.E("metric_name", metricName), sb.E("type", metrictypes.ExpHistogramType.StringValue()))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var isExpHist bool
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&isExpHist); err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to check metric type")
	}
	return isExpHist, nil
}

func (c *clickhouse) AttributeKeys(ctx context.Context, metricName string, startMs, endMs int64) ([]string, error) {
	ctx = c.withThreads(ctx)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("attr_name")
	sb.Distinct()
	sb.From(metadataTable)
	sb.Where(
		sb.E("metric_name", metricName),
		"NOT startsWith(attr_name, '__')",
		sb.GE("last_reported_unix_milli", startMs),
		sb.LE("first_reported_unix_milli", endMs),
	)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch metric attribute keys")
	}
	defer rows.Close()

	keys := make([]string, 0)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan attribute key")
		}
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (c *clickhouse) tableExists(ctx context.Context, distributedTableName string) bool {
	var exists bool
	query := "SELECT count() > 0 FROM system.tables WHERE database = ? AND name = ?"
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, telemetrymetrics.DBName, distributedTableName).Scan(&exists); err != nil {
		return false
	}
	return exists
}

func (c *clickhouse) originalSeriesSource(ctx context.Context) (table string, originalOnly bool) {
	if c.tableExists(ctx, telemetrymetrics.TimeseriesV4BufferTableName) {
		return telemetrymetrics.DBName + "." + telemetrymetrics.TimeseriesV4BufferTableName, true
	}
	return telemetrymetrics.DBName + "." + telemetrymetrics.TimeseriesV4TableName, false
}

func (c *clickhouse) EstimateCardinality(ctx context.Context, metricName string, keptLabels []string, startMs, endMs int64) (uint64, uint64, error) {
	ctx = c.withThreads(ctx)
	table, originalOnly := c.originalSeriesSource(ctx)
	startMs = floorToTimeSeriesBucket(startMs)

	sb := sqlbuilder.NewSelectBuilder()

	reducedExpr := "1"
	if len(keptLabels) > 0 {
		reducedExpr = "countDistinct(("
		for i, label := range keptLabels {
			if i > 0 {
				reducedExpr += ", "
			}
			reducedExpr += "JSONExtractString(labels, " + sb.Var(label) + ")"
		}
		reducedExpr += "))"
	}

	sb.Select("countDistinct(fingerprint)", reducedExpr)
	sb.From(table)
	conds := []string{
		sb.E("metric_name", metricName),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
	}
	if originalOnly {
		conds = append(conds, sb.E("is_reduced", false))
	}
	sb.Where(conds...)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var current, reduced uint64
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&current, &reduced); err != nil {
		return 0, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to estimate reduction impact")
	}
	if len(keptLabels) == 0 && current == 0 {
		reduced = 0
	}
	if reduced > current {
		reduced = current
	}
	return current, reduced, nil
}

type volumeRow struct {
	MetricName string
	Ingested   uint64
	Reduced    uint64
}

func (c *clickhouse) VolumeByMetric(ctx context.Context, metricNames []string, startMs, endMs int64) (map[string]volumeRow, error) {
	if len(metricNames) == 0 {
		return map[string]volumeRow{}, nil
	}
	ctx = c.withThreads(ctx)

	ingestedTable, originalOnly := c.originalSeriesSource(ctx)
	ingested, err := c.countSeries(ctx, ingestedTable, originalOnly, metricNames, startMs, endMs)
	if err != nil {
		return nil, err
	}

	reduced := ingested
	if c.tableExists(ctx, telemetrymetrics.TimeseriesV4ReducedTableName) {
		reduced, err = c.countSeries(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.TimeseriesV4ReducedTableName, false, metricNames, startMs, endMs)
		if err != nil {
			return nil, err
		}
	}

	out := make(map[string]volumeRow, len(metricNames))
	for metricName, count := range ingested {
		out[metricName] = volumeRow{MetricName: metricName, Ingested: count, Reduced: out[metricName].Reduced}
	}
	for metricName, count := range reduced {
		row := out[metricName]
		row.MetricName = metricName
		row.Reduced = count
		out[metricName] = row
	}
	return out, nil
}

func (c *clickhouse) countSeries(ctx context.Context, table string, originalOnly bool, metricNames []string, startMs, endMs int64) (map[string]uint64, error) {
	startMs = floorToTimeSeriesBucket(startMs)
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", "countDistinct(fingerprint)")
	sb.From(table)
	conds := []string{
		sb.In("metric_name", names...),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
	}
	if originalOnly {
		conds = append(conds, sb.E("is_reduced", false))
	}
	sb.Where(conds...)
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to count metric series")
	}
	defer rows.Close()

	out := make(map[string]uint64, len(metricNames))
	for rows.Next() {
		var (
			metricName string
			count      uint64
		)
		if err := rows.Scan(&metricName, &count); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan series count")
		}
		out[metricName] = count
	}
	return out, rows.Err()
}

func (c *clickhouse) RankByVolume(ctx context.Context, metricNames []string, orderBy metricreductionruletypes.ReductionRuleOrderBy, order metricreductionruletypes.Order, startMs, endMs int64, offset, limit int) ([]volumeRow, error) {
	if len(metricNames) == 0 {
		return []volumeRow{}, nil
	}
	ctx = c.withThreads(ctx)

	ingestedTable, originalOnly := c.originalSeriesSource(ctx)
	reducedPresent := c.tableExists(ctx, telemetrymetrics.TimeseriesV4ReducedTableName)
	startMs = floorToTimeSeriesBucket(startMs)

	orderExpr := "ingested"
	switch orderBy {
	case metricreductionruletypes.OrderByReducedVolume:
		orderExpr = "reduced"
	case metricreductionruletypes.OrderByReduction:
		orderExpr = "if(ingested = 0, 0, (toFloat64(ingested) - toFloat64(reduced)) / toFloat64(ingested))"
	}
	direction := "ASC"
	if order == metricreductionruletypes.OrderDesc {
		direction = "DESC"
	}

	ingestedFilter := ""
	if originalOnly {
		ingestedFilter = "is_reduced = false AND "
	}
	reducedSelect := "ifNull(i.cnt, 0) AS reduced"
	if reducedPresent {
		reducedSelect = "ifNull(d.cnt, 0) AS reduced"
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("base.metric_name AS metric_name", "ifNull(i.cnt, 0) AS ingested", reducedSelect)
	sb.From("(SELECT arrayJoin(" + sb.Var(metricNames) + ") AS metric_name) AS base")
	sb.JoinWithOption(
		sqlbuilder.LeftJoin,
		"(SELECT metric_name, countDistinct(fingerprint) AS cnt FROM "+ingestedTable+" WHERE has("+sb.Var(metricNames)+", metric_name) AND "+ingestedFilter+"unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" GROUP BY metric_name) AS i",
		"base.metric_name = i.metric_name",
	)
	if reducedPresent {
		reducedTable := telemetrymetrics.DBName + "." + telemetrymetrics.TimeseriesV4ReducedTableName
		sb.JoinWithOption(
			sqlbuilder.LeftJoin,
			"(SELECT metric_name, countDistinct(fingerprint) AS cnt FROM "+reducedTable+" WHERE has("+sb.Var(metricNames)+", metric_name) AND unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" GROUP BY metric_name) AS d",
			"base.metric_name = d.metric_name",
		)
	}
	sb.OrderBy(orderExpr + " " + direction)
	if limit > 0 {
		sb.Limit(limit).Offset(offset)
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to rank reduction rules by volume")
	}
	defer rows.Close()

	out := make([]volumeRow, 0, len(metricNames))
	for rows.Next() {
		var row volumeRow
		if err := rows.Scan(&row.MetricName, &row.Ingested, &row.Reduced); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan volume row")
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
