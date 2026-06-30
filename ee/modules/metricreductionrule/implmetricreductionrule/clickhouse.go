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
)

var (
	reductionRulesTable = telemetrymetrics.DBName + "." + telemetrymetrics.ReductionRulesTableName
	metadataTable       = telemetrymetrics.DBName + "." + telemetrymetrics.AttributesMetadataTableName
	bufferSeriesTable   = telemetrymetrics.DBName + "." + telemetrymetrics.TimeseriesV4BufferTableName
)

const timeSeriesBucketMilli = int64(time.Hour / time.Millisecond)

const sampleBucketExpr = "toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalMinute(10)))) * 1000 AS bucket"

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

func floorToTimeSeriesBucket(ms int64) int64 {
	return ms - (ms % timeSeriesBucketMilli)
}

func strictEffectiveFrom(sb *sqlbuilder.SelectBuilder, metricNames []string, effectiveFrom map[string]int64) string {
	names := make([]any, 0, len(metricNames))
	froms := make([]any, 0, len(metricNames))
	for _, name := range metricNames {
		names = append(names, name)
		froms = append(froms, effectiveFrom[name])
	}
	return "unix_milli >= transform(metric_name, " + sb.Var(names) + ", " + sb.Var(froms) + ", 0)"
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

func (c *clickhouse) EstimateCardinality(ctx context.Context, metricName string, keptLabels []string, startMs, endMs int64) (uint64, uint64, error) {
	ctx = c.withThreads(ctx)
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
	sb.From(bufferSeriesTable)
	conds := []string{
		sb.E("metric_name", metricName),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
		sb.E("is_reduced", false),
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

// VolumeByMetric returns ingested vs reduced series counts per metric.
func (c *clickhouse) VolumeByMetric(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]volumeRow, error) {
	if len(metricNames) == 0 {
		return map[string]volumeRow{}, nil
	}
	ctx = c.withThreads(ctx)

	ingested, err := c.ingestedSeriesCount(ctx, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	reduced, err := c.reducedSeriesCount(ctx, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
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

// ingestedSeriesCount counts distinct raw fingerprints per metric from the samples buffer over the
// window.
func (c *clickhouse) ingestedSeriesCount(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", "uniq(fingerprint)")
	sb.From(telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4BufferTableName)
	conds := []string{
		sb.In("metric_name", names...),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
	}
	if len(effectiveFrom) > 0 {
		conds = append(conds, strictEffectiveFrom(sb, metricNames, effectiveFrom))
	}
	sb.Where(conds...)
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to count ingested series")
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

// reducedSeriesCount counts distinct reduced_fingerprints per metric, summed across the two 60s
// reduced sample tables.
func (c *clickhouse) reducedSeriesCount(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]uint64, error) {
	out := make(map[string]uint64, len(metricNames))
	for _, table := range []string{telemetrymetrics.SamplesV4ReducedLastTableName, telemetrymetrics.SamplesV4ReducedSumTableName} {
		counts, err := c.reducedSeriesCountForTable(ctx, telemetrymetrics.DBName+"."+table, metricNames, effectiveFrom, startMs, endMs)
		if err != nil {
			return nil, err
		}
		for metricName, count := range counts {
			out[metricName] += count
		}
	}
	return out, nil
}

func (c *clickhouse) reducedSeriesCountForTable(ctx context.Context, table string, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", "uniq(reduced_fingerprint)")
	sb.From(table)
	conds := []string{
		sb.In("metric_name", names...),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
	}
	if len(effectiveFrom) > 0 {
		conds = append(conds, strictEffectiveFrom(sb, metricNames, effectiveFrom))
	}
	sb.Where(conds...)
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to count reduced series")
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

// RankByVolume ranks metrics by ingested/reduced series volume. Like VolumeByMetric, the counts read
// the samples tables with a strict effective_from gate; the reduced count sums distinct
// reduced_fingerprints across the two 60s reduced sample tables.
func (c *clickhouse) RankByVolume(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, orderBy metricreductionruletypes.ReductionRuleOrderBy, order metricreductionruletypes.Order, startMs, endMs int64, offset, limit int) ([]volumeRow, error) {
	if len(metricNames) == 0 {
		return []volumeRow{}, nil
	}
	ctx = c.withThreads(ctx)

	orderExpr := "ifNull(i.samples, 0)"
	if orderBy == metricreductionruletypes.OrderByReducedVolume {
		orderExpr = "if(ifNull(d.samples, 0) = 0 OR ifNull(d.samples, 0) > ifNull(i.samples, 0), ifNull(i.samples, 0), ifNull(d.samples, 0))"
	}
	direction := "ASC"
	if order == metricreductionruletypes.OrderDesc {
		direction = "DESC"
	}

	ingestedTable := telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4BufferTableName
	reducedLast := telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4ReducedLastTableName
	reducedSum := telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4ReducedSumTableName

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("base.metric_name AS metric_name", "ifNull(i.cnt, 0) AS ingested", "ifNull(d.cnt, 0) AS reduced")
	sb.From("(SELECT arrayJoin(" + sb.Var(metricNames) + ") AS metric_name) AS base")
	sb.JoinWithOption(
		sqlbuilder.LeftJoin,
		"(SELECT metric_name, uniq(fingerprint) AS cnt, count() AS samples FROM "+ingestedTable+" WHERE has("+sb.Var(metricNames)+", metric_name) AND unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" AND "+strictEffectiveFrom(sb, metricNames, effectiveFrom)+" GROUP BY metric_name) AS i",
		"base.metric_name = i.metric_name",
	)
	// Reduced series are spread across two type-specific tables; union the per-table distinct
	// reduced_fingerprints and sum per metric (a metric only lands in the table matching its type).
	sb.JoinWithOption(
		sqlbuilder.LeftJoin,
		"(SELECT metric_name, sum(cnt) AS cnt, sum(samples) AS samples FROM ("+
			"SELECT metric_name, uniq(reduced_fingerprint) AS cnt, uniq(reduced_fingerprint, unix_milli) AS samples FROM "+reducedLast+" WHERE has("+sb.Var(metricNames)+", metric_name) AND unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" AND "+strictEffectiveFrom(sb, metricNames, effectiveFrom)+" GROUP BY metric_name"+
			" UNION ALL "+
			"SELECT metric_name, uniq(reduced_fingerprint) AS cnt, uniq(reduced_fingerprint, unix_milli) AS samples FROM "+reducedSum+" WHERE has("+sb.Var(metricNames)+", metric_name) AND unix_milli >= "+sb.Var(startMs)+" AND unix_milli < "+sb.Var(endMs)+" AND "+strictEffectiveFrom(sb, metricNames, effectiveFrom)+" GROUP BY metric_name"+
			") GROUP BY metric_name) AS d",
		"base.metric_name = d.metric_name",
	)
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

func (c *clickhouse) SampleVolumeByMetric(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]volumeRow, error) {
	if len(metricNames) == 0 {
		return map[string]volumeRow{}, nil
	}
	ctx = c.withThreads(ctx)

	ingested, err := c.countSamplesByMetric(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.SamplesV4BufferTableName, "count()", metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	last, err := c.countSamplesByMetric(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.SamplesV4ReducedLastTableName, "uniq(reduced_fingerprint, unix_milli)", metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}
	sum, err := c.countSamplesByMetric(ctx, telemetrymetrics.DBName+"."+telemetrymetrics.SamplesV4ReducedSumTableName, "uniq(reduced_fingerprint, unix_milli)", metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	out := make(map[string]volumeRow, len(metricNames))
	for _, name := range metricNames {
		out[name] = volumeRow{MetricName: name, Ingested: ingested[name], Reduced: last[name] + sum[name]}
	}
	return out, nil
}

func (c *clickhouse) countSamplesByMetric(ctx context.Context, table, countExpr string, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[string]uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", countExpr)
	sb.From(table)
	conds := []string{
		sb.In("metric_name", names...),
		sb.GE("unix_milli", startMs),
		sb.LT("unix_milli", endMs),
	}
	if len(effectiveFrom) > 0 {
		conds = append(conds, strictEffectiveFrom(sb, metricNames, effectiveFrom))
	}
	sb.Where(conds...)
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to count samples")
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

func (c *clickhouse) TotalVolume(ctx context.Context, startMs, endMs int64) (uint64, uint64, error) {
	ctx = c.withThreads(ctx)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("uniq(fingerprint)", "count()")
	sb.From(telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4BufferTableName)
	sb.Where(sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var series, samples uint64
	if err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&series, &samples); err != nil {
		return 0, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to count total ingested volume")
	}
	return series, samples, nil
}

func (c *clickhouse) SampleTimeseries(ctx context.Context, ruledMetrics []string, effectiveFrom map[string]int64, startMs, endMs int64) ([]volumePoint, error) {
	ctx = c.withThreads(ctx)

	ingested, err := c.totalSamplesByBucket(ctx, startMs, endMs)
	if err != nil {
		return nil, err
	}

	ruledIngested := make(map[int64]uint64)
	ruledRetained := make(map[int64]uint64)
	if len(ruledMetrics) > 0 {
		ruledIngested, err = c.ruledIngestedSamplesByBucket(ctx, ruledMetrics, effectiveFrom, startMs, endMs)
		if err != nil {
			return nil, err
		}
		ruledRetained, err = c.ruledRetainedSamplesByBucket(ctx, ruledMetrics, effectiveFrom, startMs, endMs)
		if err != nil {
			return nil, err
		}
	}

	retained := make(map[int64]uint64, len(ingested))
	for ts, total := range ingested {
		shed := uint64(0)
		if ri := ruledIngested[ts]; ri > ruledRetained[ts] {
			shed = ri - ruledRetained[ts]
		}
		if total > shed {
			retained[ts] = total - shed
		} else {
			retained[ts] = 0
		}
	}

	return mergeVolumePoints(ingested, retained), nil
}

func (c *clickhouse) totalSamplesByBucket(ctx context.Context, startMs, endMs int64) (map[int64]uint64, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(sampleBucketExpr, "count()")
	sb.From(telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4BufferTableName)
	sb.Where(sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs))
	sb.GroupBy("bucket")

	return c.scanBuckets(ctx, sb)
}

func (c *clickhouse) ruledIngestedSamplesByBucket(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[int64]uint64, error) {
	names := make([]any, len(metricNames))
	for i, name := range metricNames {
		names[i] = name
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(sampleBucketExpr, "count()")
	sb.From(telemetrymetrics.DBName + "." + telemetrymetrics.SamplesV4BufferTableName)
	conds := []string{sb.In("metric_name", names...), sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs)}
	if len(effectiveFrom) > 0 {
		conds = append(conds, strictEffectiveFrom(sb, metricNames, effectiveFrom))
	}
	sb.Where(conds...)
	sb.GroupBy("bucket")

	return c.scanBuckets(ctx, sb)
}

// reduced 60s rows are versioned by computed_at, so count distinct buckets.
func (c *clickhouse) ruledRetainedSamplesByBucket(ctx context.Context, metricNames []string, effectiveFrom map[string]int64, startMs, endMs int64) (map[int64]uint64, error) {
	out := make(map[int64]uint64)
	for _, table := range []string{telemetrymetrics.SamplesV4ReducedLastTableName, telemetrymetrics.SamplesV4ReducedSumTableName} {
		names := make([]any, len(metricNames))
		for i, name := range metricNames {
			names[i] = name
		}

		sb := sqlbuilder.NewSelectBuilder()
		sb.Select(sampleBucketExpr, "uniq(reduced_fingerprint, unix_milli)")
		sb.From(telemetrymetrics.DBName + "." + table)
		conds := []string{sb.In("metric_name", names...), sb.GE("unix_milli", startMs), sb.LT("unix_milli", endMs)}
		if len(effectiveFrom) > 0 {
			conds = append(conds, strictEffectiveFrom(sb, metricNames, effectiveFrom))
		}
		sb.Where(conds...)
		sb.GroupBy("bucket")

		counts, err := c.scanBuckets(ctx, sb)
		if err != nil {
			return nil, err
		}
		for ts, count := range counts {
			out[ts] += count
		}
	}
	return out, nil
}

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

func (c *clickhouse) scanBuckets(ctx context.Context, sb *sqlbuilder.SelectBuilder) (map[int64]uint64, error) {
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
