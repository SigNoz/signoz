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

func (recorder *statementRecorder) record(query string, args []any) {
	recorder.mu.Lock()
	defer recorder.mu.Unlock()
	recorder.statements = append(recorder.statements, prometheus.CapturedStatement{Query: query, Args: args})
}

func (recorder *statementRecorder) Statements() []prometheus.CapturedStatement {
	recorder.mu.Lock()
	defer recorder.mu.Unlock()
	out := make([]prometheus.CapturedStatement, len(recorder.statements))
	copy(out, recorder.statements)
	return out
}

type captureQueryable struct {
	client   *client
	recorder *statementRecorder
}

func (queryable *captureQueryable) Querier(mint, maxt int64) (storage.Querier, error) {
	return &captureQuerier{
		querier:  querier{mint: mint, maxt: maxt, client: queryable.client},
		recorder: queryable.recorder,
	}, nil
}

// captureQuerier builds the same SQL as the live querier but records it and
// returns no data. The fingerprint filter always takes the subquery form:
// without executing the series lookup, the inline literal set is unknown.
type captureQuerier struct {
	querier
	recorder *statementRecorder
}

func (capture *captureQuerier) Select(ctx context.Context, _ bool, hints *storage.SelectHints, matchers ...*labels.Matcher) storage.SeriesSet {

	start, end := capture.window(hints)

	samplesQuery, args, err := buildSamplesQuery(start, end, metricNamesFromMatchers(matchers), matchers, capture.lastSamplePerStepFor(ctx, hints), capture.client.cfg.MaxFetchedSamples)
	if err != nil {
		return storage.ErrSeriesSet(err)
	}
	capture.recorder.record(samplesQuery, args)

	return storage.EmptySeriesSet()
}

func (capture *captureQuerier) LabelValues(context.Context, string, *storage.LabelHints, ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	return nil, nil, nil
}

func (capture *captureQuerier) LabelNames(context.Context, *storage.LabelHints, ...*labels.Matcher) ([]string, annotations.Annotations, error) {
	return nil, nil, nil
}

// metricNamesFromMatchers extracts the statically known metric name, if any.
// Only a __name__ equality contributes; a regex selector needs a series
// lookup to learn the concrete names.
func metricNamesFromMatchers(matchers []*labels.Matcher) []string {
	for _, m := range matchers {
		if m.Name == metricNameLabel && m.Type == labels.MatchEqual && m.Value != "" {
			return []string{m.Value}
		}
	}
	return nil
}
