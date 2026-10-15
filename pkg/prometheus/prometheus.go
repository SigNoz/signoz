package prometheus

import (
	"context"
	"time"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/util/annotations"
	"github.com/prometheus/prometheus/util/stats"
)

type Engine = promql.Engine

type Parser = parser.Parser

type Prometheus interface {
	// QueryRange evaluates a range query: inside the datastore when the
	// query's shape allows it, else in the engine over the provider's
	// storage, which is always exact.
	QueryRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (*Result, error)

	// Query evaluates an instant query in the engine.
	Query(ctx context.Context, query string, ts time.Time) (*Result, error)

	// Statements returns the datastore statements the engine path of a
	// range query would run, captured without executing them.
	Statements(ctx context.Context, query string, start, end time.Time, step time.Duration) ([]CapturedStatement, error)
}

// Result is one evaluation's outcome. The caller owns Value: the provider
// never returns its sample slices to the engine's pools.
type Result struct {
	Value    parser.Value
	Warnings annotations.Annotations
	Stats    *stats.Statistics
}

// CapturedStatement is one datastore statement a PromQL query would run,
// captured without executing.
type CapturedStatement struct {
	Query string
	Args  []any
}
