package querybuildertypesv5

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrColumnNotFound      = errors.NewNotFoundf(errors.CodeNotFound, "field not found")
	ErrBetweenValues       = errors.NewInvalidInputf(errors.CodeInvalidInput, "(not) between operator requires two values")
	ErrBetweenValuesType   = errors.NewInvalidInputf(errors.CodeInvalidInput, "(not) between operator requires two values of the number type")
	ErrInValues            = errors.NewInvalidInputf(errors.CodeInvalidInput, "(not) in operator requires a list of values")
	ErrUnsupportedOperator = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator")
	// ErrNotSelectable: a field the storage can filter on but cannot read as
	// a column. The column expression builder drops such a candidate, and errors only
	// when none remains.
	ErrNotSelectable = errors.NewInvalidInputf(errors.CodeInvalidInput, "field cannot be selected")
)

// The contract between the generic query compiler (pkg/querybuilder) and
// one signal's storage knowledge. The generic side owns resolution, the
// condition builder, and the column expression builder, written once. A storage answers
// only what the generic side cannot know: two reads, one fallback, its
// traits, and two overrides for a storage with its own sub-language.
//
// Rules the generic side holds:
//  1. One resolution order for every storage and every stage.
//  2. One guard rule, derived from Absent.
//  3. The not-found warning fires only when every fallback key is a
//     guess: none of them is always present.
//  4. The stage is the operand: a nil value means a column or presence
//     use.
//  5. Metadata must report a signal's intrinsic columns. The intrinsic-column
//     step also consults the always-present Fallback keys, so a metadata
//     gap degrades to the correct column, never to a corrupt metadata
//     entry.

// QueryInfo is the query's context as one value: the org and time range
// every read needs, the signal and queried metric that family admission
// needs, and the query-path flags evaluated one time per request. The
// generic flows read FamiliesOn; only the logs storage reads BodyJSONOn.
type QueryInfo struct {
	OrgID      valuer.UUID
	StartNs    uint64
	EndNs      uint64
	Signal     telemetrytypes.Signal
	Metric     *telemetrytypes.MetricContext
	FamiliesOn bool
	BodyJSONOn bool
}

// Absent is how a field key reads for a row that does not carry it, with
// the signal's keyless contract for that reading. It describes the
// storage, never a per-query choice. Every guard derives from it.
type Absent int

const (
	// AlwaysPresent: every row reads a real value. Table columns. No guard
	// anywhere; no presence branch in a multi-candidate column.
	AlwaysPresent Absent = iota
	// AbsentIsSentinel: an absent key reads a sentinel (an empty string, 0,
	// false), and the sentinel is not a legitimate value. The field takes
	// the exists guard on positive operators and in every column stage, and
	// a presence branch in a multi-candidate column. Map-backed attributes.
	AbsentIsSentinel
	// AbsentIsNull: an absent path reads NULL natively. No condition
	// guard; a presence branch in a multi-candidate column only. JSON
	// paths.
	AbsentIsNull
	// AbsentIsValue: an absent key reads a sentinel, and the sentinel is
	// the signal's declared keyless contract (label = '' matches rows
	// without the label). No guard anywhere. Folds over such fields merge
	// by sentinel (NULLIF), never by presence branch, so a presence-branch
	// fold (a numeric family) is invalid for them. Metrics labels, rule
	// state history labels.
	AbsentIsValue
)

// Existence is a field's presence test together with its absence semantics.
type Existence struct {
	// Predicate is self-contained and arg-free, so it can sit inside
	// guards.
	Predicate  string
	WhenAbsent Absent
}

// FingerprintSplit is a signal's part in the resource fingerprint split.
type FingerprintSplit int

const (
	// NoSplit: the signal has no resource sub-query.
	NoSplit FingerprintSplit = iota
	// MainOfSplit: a fingerprint sub-query covers the resource fields the
	// metadata knows; when it runs, the main query drops them and keeps only
	// fallback keys, which the sub-query cannot know.
	MainOfSplit
	// FingerprintOfSplit: the signal is the sub-query and stores resource
	// attributes only. Terms it cannot serve are skipped; the main query
	// evaluates them.
	FingerprintOfSplit
)

// UnknownKey is what a signal does with a key that neither metadata nor
// its fallback can serve.
type UnknownKey int

const (
	// ErrorOnUnknownKey: the term is an error, with suggestions from the
	// metadata. Main queries.
	ErrorOnUnknownKey UnknownKey = iota
	// IgnoreUnknownKey: the term contributes nothing. Side queries whose
	// main query owns the error.
	IgnoreUnknownKey
)

// Traits are the per-signal capabilities the generic flows read as data.
type Traits struct {
	Split FingerprintSplit
	// SupportsBodyFunctions: has/hasAny/hasAll/hasToken/search. A
	// FingerprintOfSplit signal skips them; every other signal without
	// them rejects them before resolution.
	SupportsBodyFunctions bool
	UnknownKey            UnknownKey
	// OwnContexts are the contexts that mean "this signal's own record": a
	// key under them addresses columns and attributes alike, so the
	// resolver matches metadata as if no context was given. Strict contexts
	// (resource, attribute, scope, body) are honored as written. Body is
	// never one.
	OwnContexts []telemetrytypes.FieldContext
}

// ColumnExpr is one field's uncoerced column read, with the one thing the
// renderer cannot derive: whether the native type must survive the stage
// coercion (a time column would collapse to seconds).
type ColumnExpr struct {
	SQL      string
	KeepType bool
}

// Compiled is one field's condition with any warning that came with it. An
// empty Condition contributes nothing.
type Compiled struct {
	Condition string
	Warnings  []string
}

// Storage is what the query compiler knows about one signal's tables: two
// reads it cannot spell itself, one fallback it cannot guess, the traits it
// branches on, and the two compile steps a storage with its own sub-language
// overrides. Resolution, the condition builder, and the column expression builder live in
// querybuilder and are written once.
type Storage interface {
	// Read returns the bare SQL read of one field key: no alias, no guard,
	// no cast. It honors the materialization and evolution choices the field
	// carries.
	Read(ctx context.Context, q QueryInfo, field *telemetrytypes.TelemetryFieldKey) (string, error)

	// Exists returns the presence test of one field (negated when exists is
	// false), and how the field reads when the row lacks it. Virtual keys (a
	// span scope) answer AlwaysPresent with the predicate true.
	Exists(ctx context.Context, q QueryInfo, field *telemetrytypes.TelemetryFieldKey, exists bool) (Existence, error)

	// Fallback returns the fields that could hold a key metadata does not
	// report: column aliases, type-variant map reads, body paths, and
	// virtual keys that compile to structural predicates (a span search
	// scope, a full-text search over a scope). value is the filter operand
	// when the term has one and nil otherwise; a filter's fallback may
	// narrow the variants by it.
	Fallback(ctx context.Context, q QueryInfo, key *telemetrytypes.TelemetryFieldKey, operator FilterOperator, value any) ([]*telemetrytypes.LogicalField, error)

	Traits() Traits

	// Compile compiles one resolved field into a condition. Every storage
	// without its own condition language returns
	// querybuilder.SharedCondition. Logs (the body JSON language), the
	// resource fingerprint (index hints woven into each operator), the
	// related-values metadata (its polarity form), and metrics (labels read
	// back as String, so the cast follows the operand) compose the same
	// pieces themselves. A Compile that reads a member directly, not through
	// querybuilder.LogicalValueExpr, applies the member's ValueMap itself:
	// on the read, or through StoredValues on the operand. Pattern operands
	// (LIKE, REGEXP, CONTAINS) have no stored translation: transform the
	// read, or drop that member's operand-side use (an index hint), never
	// emit an untranslated one.
	Compile(ctx context.Context, q QueryInfo, field *telemetrytypes.LogicalField, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (Compiled, error)

	// ColumnRead returns the uncoerced column read of one resolved field.
	// Every storage without a read that depends on the target type returns
	// querybuilder.DefaultRead; logs (the legacy body read) and traces (time
	// columns) answer their own. target carries the stage's type as a value.
	ColumnRead(ctx context.Context, q QueryInfo, field *telemetrytypes.LogicalField, target any) (ColumnExpr, error)
}

// Resolved is what resolution produces for one key: its meanings, and how
// they came to be. It is the only thing the compilers receive. Compile it
// with the operator and value it was resolved with.
type Resolved struct {
	Key    *telemetrytypes.TelemetryFieldKey
	Fields []*telemetrytypes.LogicalField
	// FromFallback: the fields came from the storage's fallback, not from
	// metadata matches.
	FromFallback bool
	// Ambiguous: the matches held several interpretations.
	Ambiguous bool
	// Skipped: the storage contributes nothing for this key.
	Skipped  bool
	Warnings []string
}

type AggExprRewriter interface {
	// Rewrite rewrites the aggregation expression to be used in the query.
	Rewrite(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, expr string, rateInterval uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, []any, error)
	RewriteMulti(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, exprs []string, rateInterval uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey) ([]string, [][]any, error)
}

type Statement struct {
	Query          string
	Args           []any
	Warnings       []string
	WarningsDocURL string
	CostGuard      *CostGuard
}

type CostGuard struct {
	Warning     string
	MaxScanRows int64
}

// StatementBuilder builds the query.
type StatementBuilder[T any] interface {
	// Build builds the query.
	Build(ctx context.Context, orgID valuer.UUID, start, end uint64, requestType RequestType, query QueryBuilderQuery[T], variables map[string]VariableItem) (*Statement, error)
}

type TraceOperatorStatementBuilder interface {
	// Build builds the trace operator query.
	Build(ctx context.Context, orgID valuer.UUID, start, end uint64, requestType RequestType, query QueryBuilderTraceOperator, compositeQuery *CompositeQuery) (*Statement, error)
}

// StatementProvider renders a query's underlying statement without executing it.
type StatementProvider interface {
	Statement(ctx context.Context) (*Statement, error)
}
