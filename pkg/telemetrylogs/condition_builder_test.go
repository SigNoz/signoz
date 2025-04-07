package telemetrylogs

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
			expectedCol:   mainColumns["resources_string"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope name",
			key: types.TelemetryFieldKey{
				Name:         "name",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   mainColumns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope.name",
			key: types.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   mainColumns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope_name",
			key: types.TelemetryFieldKey{
				Name:         "scope_name",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   mainColumns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - version",
			key: types.TelemetryFieldKey{
				Name:         "version",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   mainColumns["scope_version"],
			expectedError: nil,
		},
		{
			name: "Scope field - other scope field",
			key: types.TelemetryFieldKey{
				Name:         "custom.scope.field",
				FieldContext: types.FieldContextScope,
			},
			expectedCol:   mainColumns["scope_string"],
			expectedError: nil,
		},
		{
			name: "Attribute field - string type",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			expectedCol:   mainColumns["attributes_string"],
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: types.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeNumber,
			},
			expectedCol:   mainColumns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: types.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeInt64,
			},
			expectedCol:   mainColumns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: types.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeFloat64,
			},
			expectedCol:   mainColumns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - bool type",
			key: types.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeBool,
			},
			expectedCol:   mainColumns["attributes_bool"],
			expectedError: nil,
		},
		{
			name: "Log field - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			expectedCol:   mainColumns["timestamp"],
			expectedError: nil,
		},
		{
			name: "Log field - body",
			key: types.TelemetryFieldKey{
				Name:         "body",
				FieldContext: types.FieldContextLog,
			},
			expectedCol:   mainColumns["body"],
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
		{
			name: "did_user_login",
			key: types.TelemetryFieldKey{
				Name:          "did_user_login",
				Signal:        types.SignalLogs,
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeBool,
			},
			expectedCol:   mainColumns["attributes_bool"],
			expectedError: nil,
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
			name: "Simple column type - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			expectedResult: "timestamp",
			expectedError:  nil,
		},
		{
			name: "Map column type - string attribute",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			expectedResult: "attributes_string['user.id']",
			expectedError:  nil,
		},
		{
			name: "Map column type - number attribute",
			key: types.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeNumber,
			},
			expectedResult: "attributes_number['request.size']",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool attribute",
			key: types.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeBool,
			},
			expectedResult: "attributes_bool['request.success']",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute",
			key: types.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: types.FieldContextResource,
			},
			expectedResult: "resources_string['service.name']",
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
			name: "Equal operator - string",
			key: types.TelemetryFieldKey{
				Name:         "body",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "error message",
			expectedSQL:   "body = ?",
			expectedError: nil,
		},
		{
			name: "Not Equal operator - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <> ?",
			expectedError: nil,
		},
		{
			name: "Greater Than operator - number attribute",
			key: types.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         float64(100),
			expectedSQL:   "attributes_number['request.duration'] > ?",
			expectedError: nil,
		},
		{
			name: "Less Than operator - number attribute",
			key: types.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         float64(1024),
			expectedSQL:   "attributes_number['request.size'] < ?",
			expectedError: nil,
		},
		{
			name: "Greater Than Or Equal operator - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorGreaterThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp >= ?",
			expectedError: nil,
		},
		{
			name: "Less Than Or Equal operator - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorLessThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <= ?",
			expectedError: nil,
		},
		{
			name: "Like operator - body",
			key: types.TelemetryFieldKey{
				Name:         "body",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         "%error%",
			expectedSQL:   "body LIKE ?",
			expectedError: nil,
		},
		{
			name: "Not Like operator - body",
			key: types.TelemetryFieldKey{
				Name:         "body",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotLike,
			value:         "%error%",
			expectedSQL:   "body NOT LIKE ?",
			expectedError: nil,
		},
		{
			name: "ILike operator - string attribute",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorILike,
			value:         "%admin%",
			expectedSQL:   "WHERE LOWER(attributes_string['user.id']) LIKE LOWER(?)",
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
			expectedSQL:   "WHERE LOWER(attributes_string['user.id']) NOT LIKE LOWER(?)",
			expectedError: nil,
		},
		{
			name: "Between operator - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp BETWEEN ? AND ?",
			expectedError: nil,
		},
		{
			name: "Between operator - invalid value",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         "invalid",
			expectedSQL:   "",
			expectedError: types.ErrBetweenValues,
		},
		{
			name: "Between operator - insufficient values",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000)},
			expectedSQL:   "",
			expectedError: types.ErrBetweenValues,
		},
		{
			name: "Not Between operator - timestamp",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp NOT BETWEEN ? AND ?",
			expectedError: nil,
		},
		{
			name: "In operator - severity_text",
			key: types.TelemetryFieldKey{
				Name:         "severity_text",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"error", "fatal", "critical"},
			expectedSQL:   "severity_text IN (?, ?, ?)",
			expectedError: nil,
		},
		{
			name: "In operator - invalid value",
			key: types.TelemetryFieldKey{
				Name:         "severity_text",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         "error",
			expectedSQL:   "",
			expectedError: types.ErrInValues,
		},
		{
			name: "Not In operator - severity_text",
			key: types.TelemetryFieldKey{
				Name:         "severity_text",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotIn,
			value:         []any{"debug", "info", "trace"},
			expectedSQL:   "severity_text NOT IN (?, ?, ?)",
			expectedError: nil,
		},
		{
			name: "Exists operator - string field",
			key: types.TelemetryFieldKey{
				Name:         "body",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "body <> ?",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - string field",
			key: types.TelemetryFieldKey{
				Name:         "body",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "body = ?",
			expectedError: nil,
		},
		{
			name: "Exists operator - number field",
			key: types.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "timestamp <> ?",
			expectedError: nil,
		},
		{
			name: "Exists operator - map field",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "mapContains(attributes_string, 'user.id') = ?",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - map field",
			key: types.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  types.FieldContextAttribute,
				FieldDataType: types.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "mapContains(attributes_string, 'user.id') <> ?",
			expectedError: nil,
		},
		{
			name: "Non-existent column",
			key: types.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: types.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "value",
			expectedSQL:   "",
			expectedError: types.ErrColumnNotFound,
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

func TestGetConditionMultiple(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder()

	testCases := []struct {
		name          string
		keys          []types.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedError error
	}{
		{
			name: "Equal operator - string",
			keys: []types.TelemetryFieldKey{
				{
					Name:         "body",
					FieldContext: types.FieldContextLog,
				},
				{
					Name:         "severity_text",
					FieldContext: types.FieldContextLog,
				},
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "error message",
			expectedSQL:   "body = ? AND severity_text = ?",
			expectedError: nil,
		},
	}

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			var err error
			for _, key := range tc.keys {
				cond, err := conditionBuilder.GetCondition(ctx, key, tc.operator, tc.value, sb)
				sb.Where(cond)
				if err != nil {
					t.Fatalf("Error getting condition for key %s: %v", key.Name, err)
				}
			}

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
