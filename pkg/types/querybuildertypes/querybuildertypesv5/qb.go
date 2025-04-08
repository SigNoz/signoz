package types

import (
	"context"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// FilterOperator is the operator for the filter.
type FilterOperator int

const (
	FilterOperatorUnknown FilterOperator = iota
	FilterOperatorEqual
	FilterOperatorNotEqual
	FilterOperatorGreaterThan
	FilterOperatorGreaterThanOrEq
	FilterOperatorLessThan
	FilterOperatorLessThanOrEq

	FilterOperatorLike
	FilterOperatorNotLike
	FilterOperatorILike
	FilterOperatorNotILike

	FilterOperatorBetween
	FilterOperatorNotBetween

	FilterOperatorIn
	FilterOperatorNotIn

	FilterOperatorExists
	FilterOperatorNotExists

	FilterOperatorRegexp
	FilterOperatorNotRegexp

	FilterOperatorContains
	FilterOperatorNotContains
)

// ConditionBuilder is the interface for building the condition part of the query.
type ConditionBuilder interface {
	// GetColumn returns the column for the given key.
	GetColumn(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error)

	// GetTableFieldName returns the table field name for the given key.
	GetTableFieldName(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error)

	// GetCondition returns the condition for the given key, operator and value.
	GetCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)
}
