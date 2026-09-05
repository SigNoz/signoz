package clickhouseprometheusv2

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/huandu/go-sqlbuilder"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/util/annotations"
)

// defaultLookbackDelta mirrors promql's default when the config leaves the
// lookback unset; the engine and the storage must agree on it for
// last-sample-per-step bucket anchoring.
const defaultLookbackDelta = 5 * time.Minute

// querier is a native storage.Querier over ClickHouse: Select builds SQL
// directly from the matchers and hints, with no remote-read protobuf layer.
type querier struct {
	mint, maxt int64
	client     *client
}

var _ storage.Querier = (*querier)(nil)

func (q *querier) Select(ctx context.Context, sortSeries bool, hints *storage.SelectHints, matchers ...*labels.Matcher) storage.SeriesSet {
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

	// The engine assumes storages never emit duplicate label sets.
	list = sortAndMerge(list)
	return newSeriesSet(list)
}

func (q *querier) LabelValues(ctx context.Context, name string, hints *storage.LabelHints, matchers ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	sb := sqlbuilder.NewSelectBuilder()
	if name == metricNameLabel {
		sb.Select("DISTINCT metric_name AS value")
	} else {
		sb.Select(fmt.Sprintf("DISTINCT JSONExtractString(labels, %s) AS value", sb.Var(name)))
	}
	adjustedStart, _, table, _ := metricstelemetryschema.WhichTSTableToUse(uint64(q.mint), uint64(q.maxt), false, nil)
	sb.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, table))
	if err := applySeriesConditions(sb, int64(adjustedStart), q.maxt, matchers); err != nil {
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

func (q *querier) LabelNames(ctx context.Context, hints *storage.LabelHints, matchers ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("DISTINCT arrayJoin(JSONExtractKeys(labels)) AS name")
	adjustedStart, _, table, _ := metricstelemetryschema.WhichTSTableToUse(uint64(q.mint), uint64(q.maxt), false, nil)
	sb.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, table))
	if err := applySeriesConditions(sb, int64(adjustedStart), q.maxt, matchers); err != nil {
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

// window returns the per-selector fetch window from the hints (already
// adjusted for offset, @, range and lookback); mint/maxt span the union of
// all selectors and are the fallback.
func (q *querier) window(hints *storage.SelectHints) (int64, int64) {
	if hints != nil && hints.Start != 0 && hints.End != 0 && hints.Start <= hints.End {
		return hints.Start, hints.End
	}
	return q.mint, q.maxt
}

// lastSamplePerStepFor decides whether the fetch can keep only the last
// sample per step bucket (see lastSamplePerStep). Only instant selectors
// (hints.Range == 0) of subquery-free queries qualify: range selectors need
// every raw sample, and subquery selectors evaluate at the subquery's own
// step while hints carry the top-level step — the subquery-free proof
// arrives as QueryTraits in the context. The first evaluation timestamp is
// recovered as hints.Start + lookback - 1ms, inverting how the engine
// derives hints.Start.
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

// fetchSamples runs the samples query for the matched series (see
// buildSamplesQuery).
func (q *querier) fetchSamples(ctx context.Context, start, end int64, matchers []*labels.Matcher, lookup *seriesLookup, lastPerStep *lastSamplePerStep) ([]*series, error) {
	query, args, err := buildSamplesQuery(start, end, lookup.metricNames, matchers, lastPerStep)
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
