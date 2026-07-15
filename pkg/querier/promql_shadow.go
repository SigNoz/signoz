package querier

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"sort"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheusv2"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
)

// shadowTimeout bounds a shadow evaluation; a shadow run must never outlive
// the request by much or pile up.
const shadowTimeout = 2 * time.Minute

// runShadowCompare executes the query on the clickhousev2 provider exactly
// as it would serve (transpiled when the shape allows, engine over the v2
// querier otherwise), compares against the served result and logs the
// outcome. Serving is never affected: this runs after the response, off the
// request context, and only logs. The mismatch and failure logs are the
// rollout evidence — serving cuts over to v2 only after they stay clean.
func (q *promqlQuery) runShadowCompare(ctx context.Context, query string, startNs, endNs int64, served promql.Matrix, servedIn time.Duration) {
	defer func() {
		if r := recover(); r != nil {
			q.logger.ErrorContext(ctx, "promql shadow comparison panicked", slog.Any("panic", r), slog.String("query", query))
		}
	}()

	ctx, cancel := context.WithTimeout(ctx, shadowTimeout)
	defer cancel()

	// The request context carries the served response's scan-stats progress
	// callback; without replacing it the shadow's ClickHouse progress would
	// race into the served stats. The response itself was already sent.
	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(*clickhouse.Progress) {}))

	if expr, parseErr := q.parser.ParseExpr(query); parseErr == nil {
		ctx = prometheus.NewContextWithQueryTraits(ctx, prometheus.DetectQueryTraits(expr))
	}

	start, end := time.Unix(0, startNs), time.Unix(0, endNs)
	began := time.Now()
	shadow, transpiled, err := executeOnProvider(ctx, q.opts.shadow, query, start, end, q.query.Step.Duration)
	shadowIn := time.Since(began)

	logAttrs := []any{
		slog.String("query", query),
		slog.Int64("start_ms", startNs/int64(time.Millisecond)),
		slog.Int64("end_ms", endNs/int64(time.Millisecond)),
		slog.Duration("step", q.query.Step.Duration),
		slog.Bool("transpiled", transpiled),
		slog.Duration("served_in", servedIn),
		slog.Duration("shadow_in", shadowIn),
	}

	if err != nil {
		// A shadow failure would be a serving failure after rollout; surface
		// it at the same level as a result mismatch.
		q.logger.WarnContext(ctx, "promql shadow execution failed", append(logAttrs, slog.Any("error", err))...)
		return
	}

	servedNorm := normalizeShadowMatrix(served)
	shadowNorm := normalizeShadowMatrix(shadow)
	if diff := diffShadowMatrices(servedNorm, shadowNorm); diff != "" {
		q.logger.WarnContext(ctx, "promql shadow comparison mismatch", append(logAttrs,
			slog.String("diff", diff),
			slog.Int("served_series", len(servedNorm)),
			slog.Int("shadow_series", len(shadowNorm)),
		)...)
		return
	}
	// Matches log the timings: served_in vs shadow_in across the fleet is
	// the perf evidence for the cutover, gathered for free.
	q.logger.DebugContext(ctx, "promql shadow comparison matched", logAttrs...)
}

// serveFromProvider evaluates the query the way the pinned provider would
// serve it.
func (q *promqlQuery) serveFromProvider(ctx context.Context, query string, startNs, endNs int64) (promql.Matrix, error) {
	matrix, _, err := executeOnProvider(ctx, q.opts.serve, query, time.Unix(0, startNs), time.Unix(0, endNs), q.query.Step.Duration)
	return matrix, err
}

// executeOnProvider evaluates the query the way the provider would serve it:
// transpiled in ClickHouse when the shape allows, the engine over the
// provider's storage otherwise. The returned matrix is an owned copy.
func executeOnProvider(ctx context.Context, prov *clickhouseprometheusv2.Provider, query string, start, end time.Time, step time.Duration) (promql.Matrix, bool, error) {
	matrix, ok, err := prov.TryExecuteRange(ctx, query, start, end, step)
	if err != nil {
		return nil, true, err
	}
	if ok {
		return matrix, true, nil
	}

	qry, err := prov.Engine().NewRangeQuery(ctx, prov.Storage(), nil, query, start, end, step)
	if err != nil {
		return nil, false, err
	}
	defer qry.Close()

	res := qry.Exec(ctx)
	if res.Err != nil {
		return nil, false, res.Err
	}
	matrix, err = res.Matrix()
	if err != nil {
		return nil, false, err
	}
	// Close returns the result's sample slices to the engine pool.
	return copyMatrix(matrix), false, nil
}

func copyMatrix(matrix promql.Matrix) promql.Matrix {
	out := make(promql.Matrix, 0, len(matrix))
	for _, s := range matrix {
		floats := make([]promql.FPoint, len(s.Floats))
		copy(floats, s.Floats)
		out = append(out, promql.Series{Metric: s.Metric.Copy(), Floats: floats})
	}
	return out
}

// normalizeShadowMatrix strips the labels the two providers legitimately
// disagree on — v1 injects a synthetic fingerprint label and leaks
// empty-valued labels from the stored attribute JSON, both removed from API
// responses anyway — and sorts by label set.
func normalizeShadowMatrix(matrix promql.Matrix) promql.Matrix {
	out := make(promql.Matrix, 0, len(matrix))
	for _, s := range matrix {
		builder := labels.NewBuilder(s.Metric)
		builder.Del(prometheus.FingerprintAsPromLabelName)
		s.Metric.Range(func(l labels.Label) {
			if l.Value == "" {
				builder.Del(l.Name)
			}
		})
		out = append(out, promql.Series{Metric: builder.Labels(), Floats: s.Floats})
	}
	sort.Slice(out, func(i, j int) bool { return labels.Compare(out[i].Metric, out[j].Metric) < 0 })
	return out
}

// diffShadowMatrices returns a description of the first difference, or "".
// Values compare with relative tolerance: spatial aggregations accumulate
// floats in storage order, which differs between the providers in the last
// ULP.
func diffShadowMatrices(served, shadow promql.Matrix) string {
	const relTol = 1e-9
	if len(served) != len(shadow) {
		return fmt.Sprintf("series count: served=%d shadow=%d", len(served), len(shadow))
	}
	for i := range served {
		if labels.Compare(served[i].Metric, shadow[i].Metric) != 0 {
			return fmt.Sprintf("series %d labels: served=%s shadow=%s", i, served[i].Metric, shadow[i].Metric)
		}
		if len(served[i].Floats) != len(shadow[i].Floats) {
			return fmt.Sprintf("series %s points: served=%d shadow=%d", served[i].Metric, len(served[i].Floats), len(shadow[i].Floats))
		}
		for j := range served[i].Floats {
			a, b := served[i].Floats[j], shadow[i].Floats[j]
			if a.T != b.T {
				return fmt.Sprintf("series %s point %d ts: served=%d shadow=%d", served[i].Metric, j, a.T, b.T)
			}
			// NaN and infinities first: NaN != NaN and Inf-Inf arithmetic
			// would otherwise make one-sided NaN and Inf-vs-finite compare
			// as equal (NaN > x and Inf > Inf are both false).
			if math.IsNaN(a.F) || math.IsNaN(b.F) {
				if math.IsNaN(a.F) != math.IsNaN(b.F) {
					return fmt.Sprintf("series %s @%d value: served=%v shadow=%v", served[i].Metric, a.T, a.F, b.F)
				}
				continue
			}
			if math.IsInf(a.F, 0) || math.IsInf(b.F, 0) {
				if a.F != b.F {
					return fmt.Sprintf("series %s @%d value: served=%v shadow=%v", served[i].Metric, a.T, a.F, b.F)
				}
				continue
			}
			diff := math.Abs(a.F - b.F)
			scale := math.Max(math.Abs(a.F), math.Abs(b.F))
			if diff > relTol*math.Max(scale, 1e-300) && diff > 1e-12 {
				return fmt.Sprintf("series %s @%d value: served=%v shadow=%v", served[i].Metric, a.T, a.F, b.F)
			}
		}
	}
	return ""
}
