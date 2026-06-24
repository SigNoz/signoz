package implmetricreductionrule

import (
	"context"
	"slices"
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

type volumeRow struct {
	MetricName string
	Ingested   uint64
	Reduced    uint64
}

type volumePoint struct {
	TimestampMs int64
	Ingested    uint64
	Reduced     uint64
}

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

// effectiveFromGate restricts ingested rows to on/after each metric's effective_from (floored to the
// hour) so a rule's pre-activation history isn't counted as reduced. A missing entry gates at 0.
func effectiveFromGate(sb *sqlbuilder.SelectBuilder, metricNames []string, effectiveFrom map[string]int64) string {
	names := make([]any, 0, len(metricNames))
	floors := make([]any, 0, len(metricNames))
	for _, name := range metricNames {
		names = append(names, name)
		floors = append(floors, floorToTimeSeriesBucket(effectiveFrom[name]))
	}
	return "unix_milli >= transform(metric_name, " + sb.Var(names) + ", " + sb.Var(floors) + ", 0)"
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
		reducedExpr = "uniq(("
		for i, label := range keptLabels {
			if i > 0 {
				reducedExpr += ", "
			}
			reducedExpr += "JSONExtractString(labels, " + sb.Var(label) + ")"
		}
		reducedExpr += "))"
	}

	sb.Select("uniq(fingerprint)", reducedExpr)
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

func (c *clickhouse) VolumeByMetric(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]volumeRow, error) {
	if len(metricNames) == 0 {
		return map[string]volumeRow{}, nil
	}
	ctx = c.withThreads(ctx)

	ingestedTable, originalOnly := c.originalSeriesSource(ctx)
	ingested, err := c.countSeries(ctx, ingestedTable, originalOnly, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	reduced := ingested
	if c.tableExists(ctx, telemetrymetrics.TimeseriesV4ReducedTableName) {
		reduced, err = c.countSeries(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.TimeseriesV4ReducedTableName, false, metricNames, nil, startMs, endMs)
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

func (c *clickhouse) countSeries(ctx context.Context, table string, originalOnly bool, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]uint64, error) {
	startMs = floorToTimeSeriesBucket(startMs)
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", "uniq(fingerprint)")
	sb.From(table)
	conds := []string{
		sb.In("metric_name", names...),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
	}
	if originalOnly {
		conds = append(conds, sb.E("is_reduced", false))
	}
	if len(effectiveFrom) > 0 {
		conds = append(conds, effectiveFromGate(sb, metricNames, effectiveFrom))
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

func (c *clickhouse) RankByVolume(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, orderBy metricreductionruletypes.ReductionRuleOrderBy, order metricreductionruletypes.Order, startMs, endMs int64, offset, limit int) ([]volumeRow, error) {
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
		"(SELECT metric_name, uniq(fingerprint) AS cnt FROM "+ingestedTable+" WHERE has("+sb.Var(metricNames)+", metric_name) AND "+ingestedFilter+"unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" AND "+effectiveFromGate(sb, metricNames, effectiveFrom)+" GROUP BY metric_name) AS i",
		"base.metric_name = i.metric_name",
	)
	if reducedPresent {
		reducedTable := telemetrymetrics.DBName + "." + telemetrymetrics.TimeseriesV4ReducedTableName
		sb.JoinWithOption(
			sqlbuilder.LeftJoin,
			"(SELECT metric_name, uniq(fingerprint) AS cnt FROM "+reducedTable+" WHERE has("+sb.Var(metricNames)+", metric_name) AND unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" GROUP BY metric_name) AS d",
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

func (c *clickhouse) SampleVolume(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (uint64, uint64, error) {
	if len(metricNames) == 0 {
		return 0, 0, nil
	}
	if !c.tableExists(ctx, telemetrymetrics.SamplesV4BufferTableName) ||
		!c.tableExists(ctx, telemetrymetrics.SamplesV4ReducedLastTableName) ||
		!c.tableExists(ctx, telemetrymetrics.SamplesV4ReducedSumTableName) {
		return 0, 0, nil
	}
	ctx = c.withThreads(ctx)

	ingested, err := c.countRawSamples(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.SamplesV4BufferTableName, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return 0, 0, err
	}

	last, err := c.countReducedSamples(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.SamplesV4ReducedLastTableName, metricNames, startMs, endMs)
	if err != nil {
		return 0, 0, err
	}
	sum, err := c.countReducedSamples(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.SamplesV4ReducedSumTableName, metricNames, startMs, endMs)
	if err != nil {
		return 0, 0, err
	}

	return ingested, min(last+sum, ingested), nil
}

func (c *clickhouse) countRawSamples(ctx context.Context, table string, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count()")
	sb.From(table)
	conds := []string{sb.In("metric_name", names...), sb.E("reduced_fingerprint", 0), sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs)}
	if len(effectiveFrom) > 0 {
		conds = append(conds, effectiveFromGate(sb, metricNames, effectiveFrom))
	}
	sb.Where(conds...)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var count uint64
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to count ingested samples")
	}
	return count, nil
}

func (c *clickhouse) countReducedSamples(ctx context.Context, table string, metricNames []string, startMs, endMs int64) (uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	// Reduced tables key the series on reduced_fingerprint (not fingerprint); dedupe ReplacingMergeTree recomputes.
	sb.Select("uniq(reduced_fingerprint, unix_milli)")
	sb.From(table)
	sb.Where(sb.In("metric_name", names...), sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var count uint64
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to count reduced samples")
	}
	return count, nil
}

// SeriesTimeseries returns ingested vs reduced series per hourly bucket; ingested is gated to each
// metric's effective_from (see effectiveFromGate).
func (c *clickhouse) SeriesTimeseries(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) ([]volumePoint, error) {
	if len(metricNames) == 0 {
		return []volumePoint{}, nil
	}
	ctx = c.withThreads(ctx)
	startMs = floorToTimeSeriesBucket(startMs)

	ingestedTable, originalOnly := c.originalSeriesSource(ctx)
	ingested, err := c.seriesByBucket(ctx, ingestedTable, originalOnly, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	reduced := ingested
	if c.tableExists(ctx, telemetrymetrics.TimeseriesV4ReducedTableName) {
		reduced, err = c.seriesByBucket(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.TimeseriesV4ReducedTableName, false, metricNames, nil, startMs, endMs)
		if err != nil {
			return nil, err
		}
	}

	return mergeVolumePoints(ingested, reduced), nil
}

// mergeVolumePoints unions two per-bucket maps into a single time-ordered series of points.
func mergeVolumePoints(ingested, reduced map[int64]uint64) []volumePoint {
	buckets := make(map[int64]struct{}, len(ingested))
	for ts := range ingested {
		buckets[ts] = struct{}{}
	}
	for ts := range reduced {
		buckets[ts] = struct{}{}
	}
	timestamps := make([]int64, 0, len(buckets))
	for ts := range buckets {
		timestamps = append(timestamps, ts)
	}
	slices.Sort(timestamps)

	points := make([]volumePoint, 0, len(timestamps))
	for _, ts := range timestamps {
		points = append(points, volumePoint{
			TimestampMs: ts,
			Ingested:    ingested[ts],
			Reduced:     reduced[ts],
		})
	}
	return points
}

func (c *clickhouse) seriesByBucket(ctx context.Context, table string, originalOnly bool, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[int64]uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("unix_milli", "uniq(fingerprint)")
	sb.From(table)
	conds := []string{sb.In("metric_name", names...), sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs)}
	if originalOnly {
		conds = append(conds, sb.E("is_reduced", false))
	}
	if len(effectiveFrom) > 0 {
		conds = append(conds, effectiveFromGate(sb, metricNames, effectiveFrom))
	}
	sb.Where(conds...)
	sb.GroupBy("unix_milli")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to bucket series by time")
	}
	defer rows.Close()

	out := make(map[int64]uint64)
	for rows.Next() {
		var (
			ts    int64
			count uint64
		)
		if err := rows.Scan(&ts, &count); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan series bucket")
		}
		out[ts] = count
	}
	return out, rows.Err()
}
