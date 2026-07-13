package querybuildertypesv5

import (
	"context"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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

type JsonKeyToFieldFunc func(context.Context, *telemetrytypes.TelemetryFieldKey, FilterOperator, any) (string, any)

// FieldMapper maps the telemetry field key to the table field name.
type FieldMapper interface {
	// FieldFor returns the field name for the given key.
	FieldFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) (string, error)
	// ColumnFor returns the column for the given key.
	ColumnFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error)
	// ColumnExpressionFor returns the column expression for the given key. Most mappers
	// return it aliased (`expr AS name`); the traces mapper returns a bare expression and
	// callers add their own alias.
	ColumnExpressionFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error)
	// CandidateKeys returns the key(s) to query for a referenced field: metadata matches for
	// the name (or `{context}.{name}`) first, else synthesized type-variant keys for sources
	// that support it, else nil (caller errors). value is the filter operand, nil otherwise.
	CandidateKeys(ctx context.Context, orgID valuer.UUID, field *telemetrytypes.TelemetryFieldKey, value any, keys map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey
}

// ConditionBuilder builds the conditions for the filter.
type ConditionBuilder interface {
	// ConditionFor returns the conditions and any advisory warnings for a filter
	// term. key is the field key as parsed from the query text; fieldKeysForName is
	// the set of known field keys matching it (may be empty). The builder owns the
	// decision of what to do — resolve ambiguity, fall back to a body JSON search,
	// emit a "not found" error, or skip — and which errors/warnings are apt.
	ConditionFor(ctx context.Context, orgID valuer.UUID, startNs uint64, endNs uint64, key *telemetrytypes.TelemetryFieldKey, fieldKeysForName []*telemetrytypes.TelemetryFieldKey, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) ([]string, []string, error)
}

// ResolvingConditionBuilder is an optional ConditionBuilder that owns key resolution itself:
// the where-clause visitor hands over the raw key + full metadata map instead of pre-matching,
// so lookup, collision handling, resource-filter skip, and synthesis live in one place.
type ResolvingConditionBuilder interface {
	ConditionForKeys(ctx context.Context, orgID valuer.UUID, startNs uint64, endNs uint64, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey, options ConditionBuilderOptions, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) ([]string, []string, error)
}

type ConditionBuilderOptions struct {
	// SkipResourceFilter drops the resource context from the candidate set.
	SkipResourceFilter bool
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
