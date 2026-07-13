package clickhouseprometheusv2

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/huandu/go-sqlbuilder"
	"github.com/prometheus/prometheus/model/labels"
)

// inlineFingerprintsLimit is the largest matched-series count inlined into
// the samples query as literals. Literals engage the samples primary key and
// avoid a second series-table scan; past a few thousand the statement itself
// becomes the cost, and the shard-local subquery filter wins. Not
// configurable: the crossover depends on statement parsing, not on any
// property of a deployment an operator could know better.
const inlineFingerprintsLimit = 5_000

// buildSeriesQuery renders the series lookup: one row per matched fingerprint
// with its labels.
func buildSeriesQuery(start, end int64, matchers []*labels.Matcher) (string, []any, error) {
	adjustedStart, table := timeSeriesTableFor(start, end)
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("fingerprint", "any(labels)")
	sb.From(fmt.Sprintf("%s.%s", databaseName, table))
	if err := applySeriesConditions(sb, adjustedStart, end, matchers); err != nil {
		return "", nil, err
	}
	sb.GroupBy("fingerprint")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args, nil
}

// buildSamplesQuery renders the samples fetch for the series selected by the
// series lookup. Small matched sets pass inlineFingerprints — sorted uint64
// literals that engage the samples primary key; nil means the set exceeded
// the inline limit, and the filter becomes a semi-join re-running the series
// predicates against the shard-local series table (complete by fingerprint
// co-locality, see localTimeSeriesTable; a GLOBAL broadcast of the matched
// set would ship it to every shard instead). metricNames narrows the
// primary-key scan; when the selector had no __name__ equality, the names
// observed on the matched series are used. A non-nil lastPerStep groups to
// one (the last) sample per step bucket.
func buildSamplesQuery(start, end int64, metricNames []string, inlineFingerprints []uint64, matchers []*labels.Matcher, lastPerStep *lastSamplePerStep) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()
	if lastPerStep != nil {
		// Aliases must not shadow source columns: ClickHouse resolves aliases
		// in WHERE too, and "max(unix_milli) AS unix_milli" would put an
		// aggregate into the WHERE clause (error 184).
		sb.Select("fingerprint", "max(unix_milli) AS ts", "argMax(value, unix_milli) AS val", "argMax(flags, unix_milli) AS fl")
	} else {
		sb.Select("fingerprint", "unix_milli", "value", "flags")
	}
	sb.From(fmt.Sprintf("%s.%s", databaseName, distributedSamplesV4))

	switch len(metricNames) {
	case 0:
		// No name constraint derivable; correct but unable to use the
		// metric_name primary-key prefix.
	case 1:
		sb.Where(sb.EQ("metric_name", metricNames[0]))
	default:
		sb.Where(sb.In("metric_name", sqlbuilder.List(metricNames)))
	}
	// temporality precedes metric_name in the samples primary key; the
	// fingerprints already come from these temporalities, so this only helps
	// granule pruning.
	sb.Where("temporality IN ['Cumulative', 'Unspecified']")
	if inlineFingerprints != nil {
		sb.Where("fingerprint " + inlineFingerprintFilter(inlineFingerprints))
	} else {
		sub := sqlbuilder.NewSelectBuilder()
		sub.Select("fingerprint")
		adjustedStart, table := timeSeriesTableFor(start, end)
		sub.From(fmt.Sprintf("%s.%s", databaseName, localTimeSeriesTable(table)))
		if err := applySeriesConditions(sub, adjustedStart, end, matchers); err != nil {
			return "", nil, err
		}
		sb.Where(sb.In("fingerprint", sub))
	}
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

// applySeriesConditions adds the WHERE conditions of a series table scan for
// the given matchers and window. __name__ matchers translate to the
// metric_name column (all four matcher types — the v1 client silently
// returned nothing for regex metric names); every other matcher translates
// to a JSONExtractString condition on the labels column. An equality matcher
// against "" matches series without the label, mirroring PromQL, because
// JSONExtractString returns "" for missing keys. Regexes are anchored:
// PromQL matchers match the whole value, while ClickHouse match() searches
// for a partial match — without anchoring, =~"api" would also select
// "x-api-y".
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
	sb.Where(fmt.Sprintf("__normalized = %v", !constants.IsDotMetricsEnabled))
	sb.Where(sb.GTE("unix_milli", start), sb.LT("unix_milli", end))

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

// inlineFingerprintFilter renders "IN (fp1, fp2, ...)" with literal uint64s.
func inlineFingerprintFilter(fingerprints []uint64) string {
	var b strings.Builder
	b.Grow(len(fingerprints)*21 + 8)
	b.WriteString("IN (")
	for i, fp := range fingerprints {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(strconv.FormatUint(fp, 10))
	}
	b.WriteString(")")
	return b.String()
}

// lastSamplePerStep reduces an instant-selector fetch to the last sample of
// each step bucket. Buckets are anchored at the selector's first evaluation
// timestamp so that every bucket boundary coincides with an evaluation
// timestamp: bucket 0 is (start, firstEval] (the initial lookback window)
// and bucket i is (firstEval+(i-1)·step, firstEval+i·step]. Keeping only the
// last sample per bucket is lossless: the engine resolves each evaluation
// timestamp t to the latest sample in (t-lookback, t], and a non-final
// sample of a bucket can never be that latest sample for any t on the
// evaluation grid. Real timestamps are preserved, so the engine's own
// lookback and staleness handling remain exact.
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
