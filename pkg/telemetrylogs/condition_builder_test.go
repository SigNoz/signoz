package telemetrylogs

import (
	"context"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetColumn(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder()

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		expectedCol   *schema.Column
		expectedError error
	}{
		{
			name: "Resource field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedCol:   logsV2Columns["resources_string"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope.name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope_name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - version",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "version",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_version"],
			expectedError: nil,
		},
		{
			name: "Scope field - other scope field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "custom.scope.field",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_string"],
			expectedError: nil,
		},
		{
			name: "Attribute field - string type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedCol:   logsV2Columns["attributes_string"],
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedCol:   logsV2Columns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
			expectedCol:   logsV2Columns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			expectedCol:   logsV2Columns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - bool type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   logsV2Columns["attributes_bool"],
			expectedError: nil,
		},
		{
			name: "Log field - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   logsV2Columns["timestamp"],
			expectedError: nil,
		},
		{
			name: "Log field - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   logsV2Columns["body"],
			expectedError: nil,
		},
		{
			name: "Log field - nonexistent",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "did_user_login",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "did_user_login",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   logsV2Columns["attributes_bool"],
			expectedError: nil,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := conditionBuilder.GetColumn(ctx, &tc.key)

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
		key            telemetrytypes.TelemetryFieldKey
		expectedResult string
		expectedError  error
	}{
		{
			name: "Simple column type - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedResult: "timestamp",
			expectedError:  nil,
		},
		{
			name: "Map column type - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult: "attributes_string['user.id']",
			expectedError:  nil,
		},
		{
			name: "Map column type - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedResult: "attributes_number['request.size']",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedResult: "attributes_bool['request.success']",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedResult: "resources_string['service.name']",
			expectedError:  nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedResult: "",
			expectedError:  qbtypes.ErrColumnNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := conditionBuilder.GetTableFieldName(ctx, &tc.key)

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
		key           telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedError error
	}{
		{
			name: "Equal operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "error message",
			expectedSQL:   "body = ?",
			expectedError: nil,
		},
		{
			name: "Not Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <> ?",
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
			expectedSQL:   "attributes_number['request.duration'] > ?",
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
			expectedSQL:   "attributes_number['request.size'] < ?",
			expectedError: nil,
		},
		{
			name: "Greater Than Or Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorGreaterThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp >= ?",
			expectedError: nil,
		},
		{
			name: "Less Than Or Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorLessThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <= ?",
			expectedError: nil,
		},
		{
			name: "Like operator - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         "%error%",
			expectedSQL:   "body LIKE ?",
			expectedError: nil,
		},
		{
			name: "Not Like operator - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotLike,
			value:         "%error%",
			expectedSQL:   "body NOT LIKE ?",
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
			expectedSQL:   "WHERE LOWER(attributes_string['user.id']) LIKE LOWER(?)",
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
			value:         "admin",
			expectedSQL:   "WHERE LOWER(attributes_string['user.id']) LIKE LOWER(?)",
			expectedError: nil,
		},
		{
			name: "Between operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp BETWEEN ? AND ?",
			expectedError: nil,
		},
		{
			name: "Between operator - invalid value",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
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
				FieldContext: telemetrytypes.FieldContextLog,
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
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp NOT BETWEEN ? AND ?",
			expectedError: nil,
		},
		{
			name: "In operator - severity_text",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "severity_text",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"error", "fatal", "critical"},
			expectedSQL:   "severity_text IN (?, ?, ?)",
			expectedError: nil,
		},
		{
			name: "In operator - invalid value",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "severity_text",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         "error",
			expectedSQL:   "",
			expectedError: qbtypes.ErrInValues,
		},
		{
			name: "Not In operator - severity_text",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "severity_text",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotIn,
			value:         []any{"debug", "info", "trace"},
			expectedSQL:   "severity_text NOT IN (?, ?, ?)",
			expectedError: nil,
		},
		{
			name: "Exists operator - string field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "body <> ?",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - string field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "body = ?",
			expectedError: nil,
		},
		{
			name: "Exists operator - number field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "timestamp <> ?",
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
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "value",
			expectedSQL:   "",
			expectedError: qbtypes.ErrColumnNotFound,
		},
	}

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.GetCondition(ctx, &tc.key, tc.operator, tc.value, sb)
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
		keys          []*telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedError error
	}{
		{
			name: "Equal operator - string",
			keys: []*telemetrytypes.TelemetryFieldKey{
				{
					Name:         "body",
					FieldContext: telemetrytypes.FieldContextLog,
				},
				{
					Name:         "severity_text",
					FieldContext: telemetrytypes.FieldContextLog,
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

func TestGetConditionJSONBodySearch(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder()

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedError error
	}{
		{
			name: "Equal operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         200,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') = ?",
			expectedError: nil,
		},
		{
			name: "Equal operator - float64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.duration_ms",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         405.5,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.duration_ms'), 'Float64') = ?",
			expectedError: nil,
		},
		{
			name: "Equal operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.method",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "GET",
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.method'), 'String') = ?",
			expectedError: nil,
		},
		{
			name: "Equal operator - bool",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.success",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         true,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.success'), 'Bool') = ?",
			expectedError: nil,
		},
		{
			name: "Exists operator",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'String') <> ?",
			expectedError: nil,
		},
		{
			name: "Not Exists operator",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'String') = ?",
			expectedError: nil,
		},
		{
			name: "Greater than operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         "200",
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') > ?",
			expectedError: nil,
		},
		{
			name: "Greater than operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         200,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') > ?",
			expectedError: nil,
		},
		{
			name: "Less than operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         "300",
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') < ?",
			expectedError: nil,
		},
		{
			name: "Less than operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         300,
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') < ?",
			expectedError: nil,
		},
		{
			name: "Contains operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         "200",
			expectedSQL:   "LOWER(JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'String')) LIKE LOWER(?)",
			expectedError: nil,
		},
		{
			name: "Not Contains operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorNotContains,
			value:         "200",
			expectedSQL:   "LOWER(JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'String')) NOT LIKE LOWER(?)",
			expectedError: nil,
		},
		{
			name: "Between operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{"200", "300"},
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') BETWEEN ? AND ?",
			expectedError: nil,
		},
		{
			name: "Between operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{400, 500},
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') BETWEEN ? AND ?",
			expectedError: nil,
		},
		{
			name: "In operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"200", "300"},
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') IN (?, ?)",
			expectedError: nil,
		},
		{
			name: "In operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{401, 404, 500},
			expectedSQL:   "JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Int64') IN (?, ?, ?)",
			expectedError: nil,
		},
	}

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.GetCondition(ctx, &tc.key, tc.operator, tc.value, sb)
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
