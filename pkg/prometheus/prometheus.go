package prometheus

import (
	"context"
	"time"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/storage"
)

type Engine = promql.Engine

type Parser = parser.Parser

type Prometheus interface {
	Engine() *Engine
	Storage() storage.Queryable
	Parser() Parser
}

// CapturedStatement is one datastore statement a PromQL query would run,
// captured without executing.
type CapturedStatement struct {
	Query string
	Args  []any
}

// StatementRecorder reads back the statements captured against a capturing
// Storage (see StatementCapturer).
type StatementRecorder interface {
	Statements() []CapturedStatement
}

// StatementCapturer is an optional Prometheus-provider capability, discovered
// via type assertion: it returns a Storage that records each Select's statement
// without executing it, plus a recorder to read them back.
type StatementCapturer interface {
	CapturingStorage() (storage.Queryable, StatementRecorder)
}

// ProviderClickhouseV2 is the clickhousev2 provider name: the factory
// registration, the prometheus::provider config value and the
// X-SigNoz-PromQL-Provider request header all use it, so they cannot drift
// apart.
const ProviderClickhouseV2 = "clickhousev2"

// RangeExecutor is the optional capability of a provider that can evaluate
// some range queries entirely inside the datastore. ok=false means the
// query is not evaluable that way. The caller then runs the engine over the
// provider's Storage, which is always exact. Only the clickhousev2 provider
// implements this capability. When that provider is the only one, the
// capability folds into Prometheus itself, and the engine-vs-datastore
// decision becomes internal.
type RangeExecutor interface {
	TryExecuteRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (promql.Matrix, bool, error)
}
