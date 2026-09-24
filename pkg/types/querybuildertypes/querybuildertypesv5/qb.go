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
)

// The contract between the generic query compiler (pkg/querybuilder) and
// one signal's tables. The generic side owns resolution, the filter
// condition, and the column expression. Each is written one time. A
// storage answers only what the generic side cannot know: one read for one
// key, one fallback, its traits, and one Compile override for a storage
// with its own condition language.
//
// Rules the generic side holds:
//  1. One resolution order for every storage, in the filter and in every
//     select field, group by, order by, and aggregation.
//  2. One guard rule, derived from Absent.
//  3. The not-found warning fires only when every fallback key is a
//     guess: none of them is always present.
//  4. The operand tells the use: a nil value means a select field, group
//     by, order by, aggregation, or presence test.
//  5. Metadata must report a signal's intrinsic columns. The intrinsic-column
//     step also reads the always-present Fallback keys. A metadata gap then
//     degrades to the correct column, never to a corrupt metadata entry.

// QueryInfo is the query's context as one value. It holds the time range
// every read needs, the signal and queried metric that family admission
// needs, and the query-path flags evaluated one time per request. The
// generic flows read FamiliesOn. Only the logs storage reads BodyJSONOn.
type QueryInfo struct {
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
	// anywhere, and no presence branch in a multi-candidate column.
	AlwaysPresent Absent = iota
	// AbsentIsSentinel: an absent key reads a sentinel (an empty string, 0,
	// false), and the sentinel is not a legitimate value. The field takes
	// the exists guard on positive operators and in every select field,
	// group by, order by, and aggregation. It takes a presence branch in a
	// multi-candidate column. Map-backed attributes.
	AbsentIsSentinel
	// AbsentIsNull: an absent path reads NULL natively. No condition guard.
	// A presence branch in a multi-candidate column only. JSON paths.
	AbsentIsNull
	// AbsentIsValue: an absent key reads a sentinel, and the sentinel is
	// the signal's declared keyless contract (label = '' matches rows
	// without the label). No guard anywhere. Folds over such fields merge
	// by sentinel (NULLIF), never by presence branch, so a presence-branch
	// fold (a numeric family) is invalid for them. Metrics labels, rule
	// state history labels.
	AbsentIsValue
)

// Read is what one key reads from the storage's tables, together with the
// membership test and what a row without the key reads. One call answers
// the filter, the column, and the resolution step alike.
type Read struct {
	// SQL is the bare value read: no alias, no guard, no cast. It honors the
	// materialization and evolution choices the key carries.
	SQL string
	// Presence is the membership test, self-contained and arg-free, so it
	// can sit inside guards.
	Presence string
	// Absence is the membership test negated, in the storage's own form
	// (`x IS NULL`, `name = ''`, `NOT mapContains(m, 'k')`), so NOT EXISTS
	// keeps the shape the planner indexes.
	Absence string
	// WhenAbsent is what SQL reads for a row without the key.
	WhenAbsent Absent
	// KeepType: the group by, order by, and aggregation cast must leave the
	// native type alone. A time column would collapse to seconds. A metrics
	// label already reads as String.
	KeepType bool
	// FilterOnly: the key filters but cannot be selected or grouped. Today
	// that is a body JSON path when the JSON body flag is off: the legacy
	// string body has no column read for a path. A select field, group by,
	// order by, or aggregation drops such a candidate, and errors only when
	// none remains.
	FilterOnly bool
}

// FingerprintSplit is a signal's part in the resource fingerprint split.
type FingerprintSplit int

const (
	// NoSplit: the signal has no resource sub-query.
	NoSplit FingerprintSplit = iota
	// MainOfSplit: a fingerprint sub-query covers the resource fields the
	// metadata knows. When it runs, the main query drops them and keeps only
	// fallback keys, which the sub-query cannot know.
	MainOfSplit
	// FingerprintOfSplit: the signal is the sub-query and stores resource
	// attributes only. It skips the terms it cannot serve, and the main
	// query evaluates them.
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
	// FingerprintOfSplit signal skips them. Every other signal without them
	// rejects them before resolution.
	SupportsBodyFunctions bool
	UnknownKey            UnknownKey
	// OwnContexts are the contexts that mean "this signal's own record": a
	// key under them addresses columns and attributes alike, so the
	// resolver matches metadata as if no context was given. Strict contexts
	// (resource, attribute, scope, body) are honored as written. Body is
	// never one.
	OwnContexts []telemetrytypes.FieldContext
}

// Compiled is one field's condition with any warning that came with it. An
// empty Condition contributes nothing.
type Compiled struct {
	Condition string
	Warnings  []string
}

// Storage is what the query compiler knows about one signal's tables. It
// gives the read of one key, which the compiler cannot spell itself. It
// gives one fallback, which the compiler cannot guess. It gives the traits
// the compiler branches on, and the one Compile step that a storage with
// its own condition language overrides. Resolution, the filter condition,
// and the column expression live in querybuilder and are written one time.
type Storage interface {
	// Read answers for one key, from metadata or from Fallback: the bare
	// value read, the membership test in both polarities, and what an
	// absent row reads. A virtual key (a span search scope) answers
	// AlwaysPresent with the predicate true.
	Read(ctx context.Context, q QueryInfo, key *telemetrytypes.TelemetryFieldKey) (Read, error)

	// Fallback returns the field keys that can hold a key that metadata
	// does not report: column aliases, the type variants of a map read,
	// body paths, and virtual keys that compile to structural predicates (a
	// span search scope, a full-text search over a scope). value is the
	// filter operand when the term has one, and nil otherwise. A filter's
	// fallback can use it to narrow the variants.
	Fallback(ctx context.Context, q QueryInfo, key *telemetrytypes.TelemetryFieldKey, operator FilterOperator, value any) ([]*telemetrytypes.LogicalField, error)

	Traits() Traits

	// Compile compiles one resolved field into one condition. A storage
	// without its own condition language returns
	// querybuilder.SharedCondition. Four storages compose the same pieces
	// themselves: logs (the body JSON language), the resource fingerprint
	// (index hints in each operator), the related-values metadata (its
	// polarity form), and metrics (labels read back as String, so the cast
	// follows the operand). A Compile that reads a member directly, not
	// through querybuilder.LogicalRead, applies the member's ValueMap
	// itself: on the read, or through StoredValues on the operand. A
	// pattern operand (LIKE, REGEXP, CONTAINS) has no stored translation.
	// Transform the read, or drop that member's operand-side use (an index
	// hint). Never emit an untranslated one.
	Compile(ctx context.Context, q QueryInfo, field *telemetrytypes.LogicalField, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (Compiled, error)
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
