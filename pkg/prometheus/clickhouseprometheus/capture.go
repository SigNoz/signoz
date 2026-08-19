package clickhouseprometheus

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/prometheus/prometheus/prompb"
	"github.com/prometheus/prometheus/storage"
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

// captureClient builds the same SQL as the real client but records it and
// returns an empty result instead of executing.
type captureClient struct {
	*client
	recorder *statementRecorder
}

func (c *captureClient) Read(ctx context.Context, query *prompb.Query, _ bool) (storage.SeriesSet, error) {
	// Raw-SQL passthrough ({job="rawsql", query="..."}): record the raw query.
	if len(query.Matchers) == 2 {
		var hasJob bool
		var queryString string
		for _, m := range query.Matchers {
			if m.Type == prompb.LabelMatcher_EQ && m.Name == "job" && m.Value == "rawsql" {
				hasJob = true
			}
			if m.Type == prompb.LabelMatcher_EQ && m.Name == "query" {
				queryString = m.Value
			}
		}
		if hasJob && queryString != "" {
			c.recorder.record(queryString, nil)
			return storage.EmptySeriesSet(), nil
		}
	}

	// Without executing the series lookup, only an exact-name selector's
	// metric name is known.
	var metricNames []string
	for _, matcher := range query.Matchers {
		if matcher.Name == "__name__" && matcher.Type == prompb.LabelMatcher_EQ {
			metricNames = []string{matcher.Value}
		}
	}

	// Build the executing path's queries, but only record them.
	sub, err := seriesLookupQuery(query, true)
	if err != nil {
		return nil, err
	}
	samplesQuery, samplesArgs := buildSamplesQuery(int64(query.StartTimestampMs), int64(query.EndTimestampMs), metricNames, sub)
	c.recorder.record(samplesQuery, samplesArgs)

	return storage.EmptySeriesSet(), nil
}

// captureQueryable adapts the capturing read client to storage.Queryable.
type captureQueryable struct {
	inner storage.SampleAndChunkQueryable
}

func (c captureQueryable) Querier(mint, maxt int64) (storage.Querier, error) {
	querier, err := c.inner.Querier(mint, maxt)
	if err != nil {
		return nil, err
	}
	return storage.NewMergeQuerier(nil, []storage.Querier{querier}, storage.ChainedSeriesMerge), nil
}
