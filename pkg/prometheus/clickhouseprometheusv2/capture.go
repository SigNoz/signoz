package clickhouseprometheusv2

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/util/annotations"
)

// statementRecorder collects the statements a PromQL evaluation would run.
// Safe for concurrent use: the engine may Select selectors concurrently.
type statementRecorder struct {
	mu         sync.Mutex
	statements []prometheus.CapturedStatement
}

func (r *statementRecorder) record(query string, args []any) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.statements = append(r.statements, prometheus.CapturedStatement{Query: query, Args: args})
}

func (r *statementRecorder) Statements() []prometheus.CapturedStatement {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]prometheus.CapturedStatement, len(r.statements))
	copy(out, r.statements)
	return out
}

type captureQueryable struct {
	client   *client
	recorder *statementRecorder
}

func (c *captureQueryable) Querier(mint, maxt int64) (storage.Querier, error) {
	return &captureQuerier{
		querier:  querier{mint: mint, maxt: maxt, client: c.client},
		recorder: c.recorder,
	}, nil
}

// captureQuerier builds the same SQL as the live querier but records it and
// returns no data. The fingerprint filter always takes the subquery form:
// without executing the series lookup, the inline literal set is unknown.
type captureQuerier struct {
	querier
	recorder *statementRecorder
}

func (c *captureQuerier) Select(ctx context.Context, _ bool, hints *storage.SelectHints, matchers ...*labels.Matcher) storage.SeriesSet {
	if rawQuery, ok := rawSQLQuery(matchers); ok {
		c.recorder.record(rawQuery, nil)
		return storage.EmptySeriesSet()
	}

	start, end := c.window(hints)

	samplesQuery, args, err := buildSamplesQuery(start, end, metricNamesFromMatchers(matchers), nil, matchers, c.lastSamplePerStepFor(ctx, hints))
	if err != nil {
		return storage.ErrSeriesSet(err)
	}
	c.recorder.record(samplesQuery, args)

	return storage.EmptySeriesSet()
}

func (c *captureQuerier) LabelValues(context.Context, string, *storage.LabelHints, ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	return nil, nil, nil
}

func (c *captureQuerier) LabelNames(context.Context, *storage.LabelHints, ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	return nil, nil, nil
}

// metricNamesFromMatchers extracts the statically known metric name, if any.
// The live path derives names from the matched series; the capture path has
// no execution results, so only a __name__ equality contributes.
func metricNamesFromMatchers(matchers []*labels.Matcher) []string {
	for _, m := range matchers {
		if m.Name == metricNameLabel && m.Type == labels.MatchEqual && m.Value != "" {
			return []string{m.Value}
		}
	}
	return nil
}
