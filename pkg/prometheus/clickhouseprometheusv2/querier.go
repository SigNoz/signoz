package clickhouseprometheusv2

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/huandu/go-sqlbuilder"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/util/annotations"
)

// defaultLookbackDelta mirrors promql's default when the config leaves the
// lookback unset; the engine and the storage must agree on it for
// last-sample-per-step bucket anchoring.
const defaultLookbackDelta = 5 * time.Minute

// querier is a native storage.Querier over ClickHouse. Unlike v1 it does not
// round-trip through the remote-read protobuf machinery: Select builds SQL
// directly from the matchers and hints, and the result set is assembled once
// into compact series.
type querier struct {
	mint, maxt int64
	client     *client
}

var _ storage.Querier = (*querier)(nil)

func (q *querier) Select(ctx context.Context, sortSeries bool, hints *storage.SelectHints, matchers ...*labels.Matcher) storage.SeriesSet {
	if rawQuery, ok := rawSQLQuery(matchers); ok {
		_, end := q.window(hints)
		list, err := q.client.queryRaw(ctx, rawQuery, end)
		if err != nil {
			return storage.ErrSeriesSet(err)
		}
		if sortSeries {
			sort.Slice(list, func(i, j int) bool { return labels.Compare(list[i].lset, list[j].lset) < 0 })
		}
		return newSeriesSet(list)
	}

	start, end := q.window(hints)

	seriesQuery, seriesArgs, err := buildSeriesQuery(start, end, matchers)
	if err != nil {
		return storage.ErrSeriesSet(err)
	}
	lookup, err := q.client.selectSeries(ctx, seriesQuery, seriesArgs)
	if err != nil {
		return storage.ErrSeriesSet(err)
	}
	if len(lookup.fingerprints) == 0 {
		return storage.EmptySeriesSet()
	}

	list, err := q.fetchSamples(ctx, start, end, matchers, lookup, q.lastSamplePerStepFor(ctx, hints))
	if err != nil {
		return storage.ErrSeriesSet(err)
	}

	// Sorting doubles as duplicate-label-set detection, which the engine
	// depends on storages never emitting; the cost is on series count, not
	// samples.
	list = sortAndMerge(list)
	return newSeriesSet(list)
}

// LabelValues returns the values of a label across series matching the
// matchers within the querier window.
func (q *querier) LabelValues(ctx context.Context, name string, hints *storage.LabelHints, matchers ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	sb := sqlbuilder.NewSelectBuilder()
	if name == metricNameLabel {
		sb.Select("DISTINCT metric_name AS value")
	} else {
		sb.Select(fmt.Sprintf("DISTINCT JSONExtractString(labels, %s) AS value", sb.Var(name)))
	}
	adjustedStart, table := timeSeriesTableFor(q.mint, q.maxt)
	sb.From(fmt.Sprintf("%s.%s", databaseName, table))
	if err := applySeriesConditions(sb, adjustedStart, q.maxt, matchers); err != nil {
		return nil, nil, err
	}
	sb.Where("value != ''")
	if hints != nil && hints.Limit > 0 {
		sb.Limit(hints.Limit)
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	values, err := q.selectStrings(ctx, "LabelValues", query, args)
	if err != nil {
		return nil, nil, err
	}
	slices.Sort(values)
	return values, nil, nil
}

// LabelNames returns the label names present on series matching the matchers
// within the querier window.
func (q *querier) LabelNames(ctx context.Context, hints *storage.LabelHints, matchers ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("DISTINCT arrayJoin(JSONExtractKeys(labels)) AS name")
	adjustedStart, table := timeSeriesTableFor(q.mint, q.maxt)
	sb.From(fmt.Sprintf("%s.%s", databaseName, table))
	if err := applySeriesConditions(sb, adjustedStart, q.maxt, matchers); err != nil {
		return nil, nil, err
	}
	if hints != nil && hints.Limit > 0 {
		sb.Limit(hints.Limit)
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	names, err := q.selectStrings(ctx, "LabelNames", query, args)
	if err != nil {
		return nil, nil, err
	}
	slices.Sort(names)
	return names, nil, nil
}

func (q *querier) Close() error {
	return nil
}

// window returns the per-selector fetch window. The engine sends per-selector
// bounds in the hints (already adjusted for offset, @, range and lookback);
// they are always at least as tight as the querier-level mint/maxt, which
// span the union of all selectors in the query.
func (q *querier) window(hints *storage.SelectHints) (int64, int64) {
	if hints != nil && hints.Start != 0 && hints.End != 0 && hints.Start <= hints.End {
		return hints.Start, hints.End
	}
	return q.mint, q.maxt
}

// lastSamplePerStepFor decides whether the fetch can keep only the last
// sample per step bucket, and computes the bucket parameters. Requirements:
//   - the call site attached QueryTraits proving the query has no subquery
//     (subquery selectors evaluate at the subquery's own step, but hints
//     carry the top-level step);
//   - the selector is an instant selector (hints.Range == 0); range selectors
//     need every raw sample in the window;
//   - per-selector hints are present.
//
// The engine derives hints.Start for instant selectors as
// firstEval - (lookback - 1ms), so the first evaluation timestamp is
// recovered as hints.Start + lookback - 1ms. Bucket boundaries then coincide
// with evaluation timestamps, which is what makes keeping only the last
// sample per bucket lossless.
func (q *querier) lastSamplePerStepFor(ctx context.Context, hints *storage.SelectHints) *lastSamplePerStep {
	if hints == nil || hints.Range != 0 || hints.Start <= 0 {
		return nil
	}
	traits, ok := prometheus.QueryTraitsFromContext(ctx)
	if !ok || !traits.SubqueryFree {
		return nil
	}
	firstEval := hints.Start + q.client.lookbackMs - 1
	if firstEval > hints.End {
		// Defensive: never anchor a bucket past the window.
		firstEval = hints.End
	}
	return &lastSamplePerStep{firstEvalMs: firstEval, stepMs: hints.Step}
}

// fetchSamples runs the samples query for the matched series. Small sets
// inline the fingerprints as sorted uint64 literals — literals engage the
// samples primary key, and sorting keeps the statement deterministic for
// logging and tests. Larger sets re-run the series predicates as a
// shard-local IN subquery instead: inlining hundreds of thousands of
// literals makes the statement itself the bottleneck, while the subquery is
// a cheap primary-key scan on each shard's own series table (see
// localTimeSeriesTable for why that is complete).
func (q *querier) fetchSamples(ctx context.Context, start, end int64, matchers []*labels.Matcher, lookup *seriesLookup, lastPerStep *lastSamplePerStep) ([]*series, error) {
	var fingerprints []uint64
	if len(lookup.fingerprints) <= inlineFingerprintsLimit {
		fingerprints = make([]uint64, 0, len(lookup.fingerprints))
		for fp := range lookup.fingerprints {
			fingerprints = append(fingerprints, fp)
		}
		slices.Sort(fingerprints)
	}
	query, args, err := buildSamplesQuery(start, end, lookup.metricNames, fingerprints, matchers, lastPerStep)
	if err != nil {
		return nil, err
	}
	return q.client.selectSamples(ctx, query, args, lookup)
}

func (q *querier) selectStrings(ctx context.Context, fn, query string, args []any) ([]string, error) {
	ctx = q.client.withContext(ctx, fn)
	rows, err := q.client.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []string
	var v string
	for rows.Next() {
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

// rawSQLQuery detects the {job="rawsql", query="..."} escape hatch.
func rawSQLQuery(matchers []*labels.Matcher) (string, bool) {
	if len(matchers) != 2 {
		return "", false
	}
	var hasJob bool
	var query string
	for _, m := range matchers {
		if m.Type == labels.MatchEqual && m.Name == "job" && m.Value == "rawsql" {
			hasJob = true
		}
		if m.Type == labels.MatchEqual && m.Name == "query" {
			query = m.Value
		}
	}
	if hasJob && query != "" {
		return query, true
	}
	return "", false
}
