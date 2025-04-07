package telemetrymetadata

import (
	"context"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types"
	qbtypes "github.com/SigNoz/signoz/pkg/types/qbtypes/v5"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetColumn(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder()

	testCases := []struct {
		name          string
		key           types.TelemetryFieldKey
		expectedCol   *schema.Column
		expectedError error
	}{
		{
			name: "Resource field",
			key: types.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: types.FieldContextResource,
			},
			expectedCol:   mainColumns["resource_attributes"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope name",
			key: types.TelemetryFieldKey{
				Name:         "name",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: types.ErrColumnNotFound,
		},
		{
			name: "Scope field - scope.name",
			key: types.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: types.ErrColumnNotFound,
		},
		{
			name: "Scope field - scope_name",
			key: types.TelemetryFieldKey{
				Name:         "scope_name",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: types.ErrColumnNotFound,
		},
		{
			name: "Scope field - version",
			key: types.TelemetryFieldKey{
				Name:         "version",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: types.ErrColumnNotFound,
		},
		{
			name: "Scope field - other scope field",
			key: types.TelemetryFieldKey{
				Name:         "custom.scope.field",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: types.ErrColumnNotFound,
		},
		{
			name: "Attribute field - string type",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			expectedCol:   mainColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: types.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeNumber,
			},
			expectedCol:   mainColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: types.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeInt64,
			},
			expectedCol:   mainColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: types.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeFloat64,
			},
			expectedCol:   mainColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Log field - nonexistent",
			key: types.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: types.FieldContextLog,
			},
			expectedCol:   nil,
			expectedError: types.ErrColumnNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := conditionBuilder.GetColumn(ctx, tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedCol, col)
			}
		})
	}
}

func TestGetFieldKeyName(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := &conditionBuilder{}

	testCases := []struct {
		name           string
		key            types.TelemetryFieldKey
		expectedResult string
		expectedError  error
	}{
		{
			name: "Map column type - string attribute",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			expectedResult: "attributes['user.id']",
			expectedError:  nil,
		},
		{
			name: "Map column type - number attribute",
			key: types.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeNumber,
			},
			expectedResult: "attributes['request.size']",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool attribute",
			key: types.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeBool,
			},
			expectedResult: "attributes['request.success']",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute",
			key: types.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: types.FieldContextResource,
			},
			expectedResult: "resource_attributes['service.name']",
			expectedError:  nil,
		},
		{
			name: "Non-existent column",
			key: types.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: types.FieldContextLog,
			},
			expectedResult: "",
			expectedError:  types.ErrColumnNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := conditionBuilder.GetTableFieldName(ctx, tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

func TestGetCondition(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder()

	testCases := []struct {
		name          string
		key           types.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedError error
	}{

		{
			name: "ILike operator - string attribute",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorILike,
			value:         "%admin%",
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND LOWER(attributes['user.id']) LIKE LOWER(?))",
			expectedError: nil,
		},
		{
			name: "Not ILike operator - string attribute",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotILike,
			value:         "%admin%",
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND LOWER(attributes['user.id']) NOT LIKE LOWER(?))",
			expectedError: nil,
		},
	}

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.GetCondition(ctx, tc.key, tc.operator, tc.value, sb)
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
