package clickhouseprometheusv2

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/huandu/go-sqlbuilder"
	"github.com/prometheus/prometheus/model/labels"
)

// metricNameLabel is the reserved PromQL label holding the metric name.
const metricNameLabel = "__name__"

// buildSeriesQuery renders the series lookup: one row per matched fingerprint
// with its labels.
func buildSeriesQuery(start, end int64, matchers []*labels.Matcher) (string, []any, error) {
	// The series tables hold one row per (fingerprint, bucket) at 1h/6h/1d/1w
	// granularities; the schema package picks the table whose bucket fits the
	// window and rounds the start down to the bucket boundary, so a window
	// beginning mid-bucket still matches the bucket's row.
	adjustedStart, _, table, _ := metricstelemetryschema.WhichTSTableToUse(uint64(start), uint64(end), false, nil)
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("fingerprint", "any(labels)")
	sb.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, table))
	if err := applySeriesConditions(sb, int64(adjustedStart), end, matchers); err != nil {
		return "", nil, err
	}
	sb.GroupBy("fingerprint")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args, nil
}

// buildSamplesQuery renders the samples fetch for the matched series: a
// semi-join re-runs the series predicates against the shard-local series
// table (complete by fingerprint co-locality, see localTimeSeriesTable — a
// GLOBAL broadcast would ship the matched set to every shard, and ClickHouse
// materializes the subquery's set per shard before the scan, so it still
// engages the fingerprint primary-key column). metricNames (observed on the
// matched series when the selector had no __name__ equality) narrows the
// primary-key scan. A non-nil lastPerStep groups to the last sample per
// step bucket.
func buildSamplesQuery(start, end int64, metricNames []string, matchers []*labels.Matcher, lastPerStep *lastSamplePerStep) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()
	if lastPerStep != nil {
		// Aliases must not shadow source columns: ClickHouse resolves aliases
		// in WHERE too, and "max(unix_milli) AS unix_milli" would put an
		// aggregate into the WHERE clause (error 184).
		sb.Select("fingerprint", "max(unix_milli) AS ts", "argMax(value, unix_milli) AS val", "argMax(flags, unix_milli) AS fl")
	} else {
		sb.Select("fingerprint", "unix_milli", "value", "flags")
	}
	sb.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, metricstelemetryschema.SamplesV4TableName))

	switch len(metricNames) {
	case 0:
		// No name constraint derivable; the primary-key prefix goes unused.
	case 1:
		sb.Where(sb.EQ("metric_name", metricNames[0]))
	default:
		sb.Where(sb.In("metric_name", sqlbuilder.List(metricNames)))
	}
	// Semantically redundant (the fingerprints already come from these
	// temporalities) but engages the leading primary-key column.
	sb.Where("temporality IN ['Cumulative', 'Unspecified']")
	sub := sqlbuilder.NewSelectBuilder()
	sub.Select("fingerprint")
	adjustedStart, _, _, localTable := metricstelemetryschema.WhichTSTableToUse(uint64(start), uint64(end), false, nil)
	sub.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, localTable))
	if err := applySeriesConditions(sub, int64(adjustedStart), end, matchers); err != nil {
		return "", nil, err
	}
	sb.Where(sb.In("fingerprint", sub))
	sb.Where(sb.GTE("unix_milli", start), sb.LTE("unix_milli", end))

	if lastPerStep != nil {
		sb.GroupBy("fingerprint")
		if expr := lastPerStep.bucketExpr(); expr != "" {
			sb.GroupBy(expr)
		}
		sb.OrderBy("fingerprint", "ts")
	} else {
		sb.OrderBy("fingerprint", "unix_milli")
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args, nil
}

// applySeriesConditions adds the WHERE conditions of a series table scan:
// __name__ matchers (all four types) translate to the metric_name column,
// every other matcher to a JSONExtractString condition on the labels column.
// An equality matcher against "" matches series without the label, mirroring
// PromQL, because JSONExtractString returns "" for missing keys. Regexes are
// anchored: PromQL matchers match the whole value, ClickHouse match()
// searches for a substring.
func applySeriesConditions(sb *sqlbuilder.SelectBuilder, start, end int64, matchers []*labels.Matcher) error {
	for _, m := range matchers {
		if m.Name != metricNameLabel {
			continue
		}
		switch m.Type {
		case labels.MatchEqual:
			sb.Where(sb.EQ("metric_name", m.Value))
		case labels.MatchNotEqual:
			sb.Where(sb.NE("metric_name", m.Value))
		case labels.MatchRegexp:
			sb.Where(fmt.Sprintf("match(metric_name, %s)", sb.Var(anchorRegex(m.Value))))
		case labels.MatchNotRegexp:
			sb.Where(fmt.Sprintf("NOT match(metric_name, %s)", sb.Var(anchorRegex(m.Value))))
		default:
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported matcher type %q for __name__", m.Type)
		}
	}

	sb.Where("temporality IN ['Cumulative', 'Unspecified']")
	// Inclusive upper bound: registration rows are hour-floored (and 6h/1d/1w
	// for the rollup tables) by the exporter, so a series first registered in
	// the bucket starting exactly at `end` would otherwise be invisible while
	// its samples (<= end) are in range.
	sb.Where(sb.GTE("unix_milli", start), sb.LTE("unix_milli", end))

	for _, m := range matchers {
		if m.Name == metricNameLabel {
			continue
		}
		switch m.Type {
		case labels.MatchEqual:
			sb.Where(fmt.Sprintf("JSONExtractString(labels, %s) = %s", sb.Var(m.Name), sb.Var(m.Value)))
		case labels.MatchNotEqual:
			sb.Where(fmt.Sprintf("JSONExtractString(labels, %s) != %s", sb.Var(m.Name), sb.Var(m.Value)))
		case labels.MatchRegexp:
			sb.Where(fmt.Sprintf("match(JSONExtractString(labels, %s), %s)", sb.Var(m.Name), sb.Var(anchorRegex(m.Value))))
		case labels.MatchNotRegexp:
			sb.Where(fmt.Sprintf("NOT match(JSONExtractString(labels, %s), %s)", sb.Var(m.Name), sb.Var(anchorRegex(m.Value))))
		default:
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported matcher type %q", m.Type)
		}
	}

	return nil
}

// anchorRegex turns a PromQL regex into its fully-anchored form (see
// applySeriesConditions).
func anchorRegex(v string) string {
	return "^(?:" + v + ")$"
}

// lastSamplePerStep reduces an instant-selector fetch to the last sample of
// each step bucket: bucket 0 is (start, firstEval], bucket i is
// (firstEval+(i-1)·step, firstEval+i·step]. Anchoring buckets at the first
// evaluation timestamp makes every bucket boundary an evaluation timestamp,
// so a non-final sample of a bucket can never be the latest sample in any
// (t-lookback, t] the engine resolves — the reduction is lossless. Real
// timestamps are preserved, so the engine's own lookback and staleness
// handling remain exact.
type lastSamplePerStep struct {
	firstEvalMs int64
	stepMs      int64
}

func (t *lastSamplePerStep) bucketExpr() string {
	if t.stepMs <= 0 {
		// Instant query: a single evaluation at firstEval; one bucket.
		return ""
	}
	return fmt.Sprintf(
		"if(unix_milli <= %d, 0, intDiv(unix_milli - %d - 1, %d) + 1)",
		t.firstEvalMs, t.firstEvalMs, t.stepMs,
	)
}
