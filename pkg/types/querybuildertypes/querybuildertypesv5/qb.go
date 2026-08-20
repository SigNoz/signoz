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

// FieldMapper is a signal's storage dialect: given a resolved physical key, it
// renders how this signal's tables express that key — its value (FieldFor),
// its presence (ExistsFor), and its backing columns (ColumnFor) — honoring
// materialization and column-generation choices carried on the key.
//
// ColumnExpressionFor and CandidateKeys additionally carry per-signal
// resolution behavior (unknown-name fallback, candidate ordering); they
// predate the resolution layer and are slated to move behind it.
type FieldMapper interface {
	// FieldFor returns the field name for the given key.
	FieldFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) (string, error)
	// ColumnFor returns the column for the given key.
	ColumnFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error)
	// ColumnExpressionFor returns the column expression for the given key. The audit,
	// metrics, metadata, and resource-filter mappers return it aliased (`expr AS name`);
	// the logs and traces mappers return a bare expression and callers add their own alias.
	// requiredDataType selects the mode: Unspecified builds a group-by/select expression;
	// a concrete type (String/Float64) builds an aggregation-argument expression coerced to it.
	ColumnExpressionFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey, requiredDataType telemetrytypes.FieldDataType, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error)
	// CandidateKeys returns the key(s) to query for a referenced field: metadata matches for
	// the name (or `{context}.{name}`) first, else synthesized type-variant keys for sources
	// that support it, else nil (caller errors). value is the filter operand, nil otherwise.
	CandidateKeys(ctx context.Context, orgID valuer.UUID, field *telemetrytypes.TelemetryFieldKey, value any, keys map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey
	// ExistsFor returns the existence predicate for a single physical key (negated when
	// exists is false), self-contained and arg-free so it can guard column expressions.
	// It is the per-member primitive querybuilder.LogicalExistsExpr and the numeric branch
	// of querybuilder.LogicalValueExpr compose family expressions from.
	ExistsFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey, exists bool) (string, error)
}

// ConditionBuilder builds the conditions for a filter term. The builder owns key resolution:
// the visitor hands it the raw key + full metadata map + options, not a pre-matched key list.
type ConditionBuilder interface {
	ConditionFor(ctx context.Context, orgID valuer.UUID, startNs uint64, endNs uint64, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey, options ConditionBuilderOptions, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) ([]string, []string, error)
}

type ConditionBuilderOptions struct {
	// SkipResourceFilter drops the resource context from the candidate set.
	SkipResourceFilter bool
	// MetricContext carries the queried metric name so metric-scoped
	// semantic-convention families can resolve.
	MetricContext *telemetrytypes.MetricContext
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
