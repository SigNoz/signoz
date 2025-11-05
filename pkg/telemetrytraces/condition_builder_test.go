package telemetrytraces

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConditionFor(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedArgs  []any
		expectedError error
	}{
		{
			name: "Not Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <> ?",
			expectedArgs:  []any{uint64(1617979338000000000)},
			expectedError: nil,
		},
		{
			name: "Greater Than operator - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         float64(100),
			expectedSQL:   "(toFloat64(attributes_number['request.duration']) > ? AND mapContains(attributes_number, 'request.duration') = ?)",
			expectedArgs:  []any{float64(100), true},
			expectedError: nil,
		},
		{
			name: "Less Than operator - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         float64(1024),
			expectedSQL:   "(toFloat64(attributes_number['request.size']) < ? AND mapContains(attributes_number, 'request.size') = ?)",
			expectedArgs:  []any{float64(1024), true},
			expectedError: nil,
		},
		{
			name: "Greater Than Or Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorGreaterThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp >= ?",
			expectedArgs:  []any{uint64(1617979338000000000)},
			expectedError: nil,
		},
		{
			name: "Less Than Or Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorLessThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <= ?",
			expectedArgs:  []any{uint64(1617979338000000000)},
			expectedError: nil,
		},
		{
			name: "ILike operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorILike,
			value:         "%admin%",
			expectedSQL:   "(LOWER(attributes_string['user.id']) LIKE LOWER(?) AND mapContains(attributes_string, 'user.id') = ?)",
			expectedArgs:  []any{"%admin%", true},
			expectedError: nil,
		},
		{
			name: "Not ILike operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotILike,
			value:         "%admin%",
			expectedSQL:   "WHERE LOWER(attributes_string['user.id']) NOT LIKE LOWER(?)",
			expectedArgs:  []any{"%admin%", true},
			expectedError: nil,
		},
		{
			name: "Contains operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         521509198310,
			expectedSQL:   "LOWER(attributes_string['user.id']) LIKE LOWER(?)",
			expectedArgs:  []any{"%521509198310%", true},
			expectedError: nil,
		},
		{
			name: "LIKE operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         521509198310,
			expectedSQL:   "attributes_string['user.id'] LIKE ?",
			expectedArgs:  []any{"521509198310", true},
			expectedError: nil,
		},
		{
			name: "Between operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp BETWEEN ? AND ?",
			expectedArgs:  []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedError: nil,
		},
		{
			name: "Between operator - invalid value",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         "invalid",
			expectedSQL:   "",
			expectedError: qbtypes.ErrBetweenValues,
		},
		{
			name: "Between operator - insufficient values",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000)},
			expectedSQL:   "",
			expectedError: qbtypes.ErrBetweenValues,
		},
		{
			name: "Not Between operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorNotBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp NOT BETWEEN ? AND ?",
			expectedArgs:  []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedError: nil,
		},
		{
			name: "Exists operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "mapContains(attributes_string, 'user.id') = ?",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "mapContains(attributes_string, 'user.id') <> ?",
			expectedError: nil,
		},
		{
			name: "Exists operator - json field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "WHERE multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - json field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "WHERE multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NULL",
			expectedError: nil,
		},
		{
			name: "Contains operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         "admin",
			expectedSQL:   "(LOWER(attributes_string['user.id']) LIKE LOWER(?) AND mapContains(attributes_string, 'user.id') = ?)",
			expectedArgs:  []any{"%admin%", true},
			expectedError: nil,
		},
		{
			name: "In operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"admin", "user"},
			expectedSQL:   "((attributes_string['user.id'] = ? OR attributes_string['user.id'] = ?) AND mapContains(attributes_string, 'user.id') = ?)",
			expectedArgs:  []any{"admin", "user", true},
			expectedError: nil,
		},
		{
			name: "Not In operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotIn,
			value:         []any{"admin", "user"},
			expectedSQL:   "(attributes_string['user.id'] <> ? AND attributes_string['user.id'] <> ?)",
			expectedArgs:  []any{"admin", "user", true},
			expectedError: nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "value",
			expectedSQL:   "",
			expectedError: qbtypes.ErrColumnNotFound,
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.ConditionFor(ctx, &tc.key, tc.operator, tc.value, sb, 1761437108000000000, 1761458708000000000)
			sb.Where(cond)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				assert.Contains(t, sql, tc.expectedSQL)
			}
		})
	}
}
