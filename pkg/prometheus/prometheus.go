package prometheus

import (
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
