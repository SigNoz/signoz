package querybuildertypesv5

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrColumnNotFound = errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "field not found")
	ErrBetweenValues  = errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "(not) between operator requires two values")
	ErrInValues       = errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "(not) in operator requires a list of values")
)

// FieldMapper maps the telemetry field key to the table field name.
type FieldMapper interface {
	// GetTableFieldName returns the table field name for the given key.
	GetTableFieldName(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error)
	GetTableColumnExpression(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error)
}

// ConditionBuilder builds the condition for the filter.
type ConditionBuilder interface {
	// GetCondition returns the condition for the given key, operator and value.
	GetCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)
}

// StatementBuilder builds the query.
type StatementBuilder interface {
	// BuildQuery builds the query.
	BuildQuery(ctx context.Context, query *QueryBuilderQuery) (string, []any, error)
}

// QueryBuilder is the interface for building the query.
type QueryBuilder interface {
	FieldMapper
	ConditionBuilder
	StatementBuilder
}
