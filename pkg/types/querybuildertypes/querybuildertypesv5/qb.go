package querybuildertypesv5

import (
	"context"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrColumnNotFound      = errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "field not found")
	ErrBetweenValues       = errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "(not) between operator requires two values")
	ErrInValues            = errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "(not) in operator requires a list of values")
	ErrUnsupportedOperator = errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unsupported operator")
)

type JsonKeyToFieldFunc func(context.Context, *telemetrytypes.TelemetryFieldKey, FilterOperator, any) (string, any)

// FieldMapper maps the telemetry field key to the table field name.
type FieldMapper interface {
	// FieldFor returns the field name for the given key.
	FieldFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error)
	// ColumnFor returns the column for the given key.
	ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error)
	// ColumnExpressionFor returns the column expression for the given key.
	ColumnExpressionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error)
}

// ConditionBuilder builds the condition for the filter.
type ConditionBuilder interface {
	// ConditionFor returns the condition for the given key, operator and value.
	ConditionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)
}

type FilterCompiler interface {
	// Compile compiles the filter into a sqlbuilder.WhereClause.
	Compile(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []string, error)
}

type RewriteCtx struct {
	RateInterval uint64
}

type RewriteOption func(*RewriteCtx)

func WithRateInterval(interval uint64) RewriteOption {
	return func(c *RewriteCtx) { c.RateInterval = interval }
}

type AggExprRewriter interface {
	// Rewrite rewrites the aggregation expression to be used in the query.
	Rewrite(ctx context.Context, expr string, opts ...RewriteOption) (string, []any, error)
}

type Statement struct {
	Query    string
	Args     []any
	Warnings []string
}

// StatementBuilder builds the query.
type StatementBuilder[T any] interface {
	// Build builds the query.
	Build(ctx context.Context, start, end uint64, requestType RequestType, query QueryBuilderQuery[T]) (*Statement, error)
}
