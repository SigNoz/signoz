package telemetrylogs

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
			name: "Equal operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "error message",
			expectedSQL:   "body = ?",
			expectedArgs:  []any{"error message"},
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
			name: "Like operator - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         "%error%",
			expectedSQL:   "LOWER(body) LIKE LOWER(?)",
			expectedArgs:  []any{"%error%"},
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
			expectedSQL:   "LOWER(body) NOT LIKE LOWER(?)",
			expectedArgs:  []any{"%error%"},
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
			expectedArgs:  []any{"%admin%"},
			expectedError: nil,
		},
		{
			name: "Contains operator - string attribute number value",
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
			name: "Contains operator - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body",
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         521509198310,
			expectedSQL:   "LOWER(body) LIKE LOWER(?)",
			expectedArgs:  []any{"%521509198310%"},
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
			expectedSQL:   "(LOWER(attributes_string['user.id']) LIKE LOWER(?) AND mapContains(attributes_string, 'user.id') = ?)",
			expectedArgs:  []any{"%admin%", true},
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
			expectedSQL:   "(severity_text = ? OR severity_text = ? OR severity_text = ?)",
			expectedArgs:  []any{"error", "fatal", "critical"},
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
			expectedSQL:   "(severity_text <> ? AND severity_text <> ? AND severity_text <> ?)",
			expectedArgs:  []any{"debug", "info", "trace"},
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
			expectedSQL:   "WHERE body <> ?",
			expectedArgs:  []any{""},
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
			expectedSQL:   "WHERE body = ?",
			expectedArgs:  []any{""},
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
			expectedArgs:  []any{true},
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
			expectedArgs:  []any{true},
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

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
            cond, err := conditionBuilder.ConditionFor(ctx, &tc.key, tc.operator, tc.value, sb, 0, 0)
			sb.Where(cond)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				assert.Contains(t, sql, tc.expectedSQL)
				assert.Equal(t, tc.expectedArgs, args)
			}
		})
	}
}

func TestConditionForMultipleKeys(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name          string
		keys          []telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedArgs  []any
		expectedError error
	}{
		{
			name: "Equal operator - string",
			keys: []telemetrytypes.TelemetryFieldKey{
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
			expectedArgs:  []any{"error message", "error message"},
			expectedError: nil,
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			var err error
			for _, key := range tc.keys {
                cond, err := conditionBuilder.ConditionFor(ctx, &key, tc.operator, tc.value, sb, 0, 0)
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

func TestConditionForJSONBodySearch(t *testing.T) {
	ctx := context.Background()

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
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') = ?`,
			expectedError: nil,
		},
		{
			name: "Equal operator - float64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.duration_ms",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         405.5,
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."duration_ms"'), 'Float64') = ?`,
			expectedError: nil,
		},
		{
			name: "Equal operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.method",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "GET",
			expectedSQL:   `JSON_VALUE(body, '$."http"."method"') = ?`,
			expectedError: nil,
		},
		{
			name: "Equal operator - bool",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.success",
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         true,
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."success"'), 'Bool') = ?`,
			expectedError: nil,
		},
		{
			name: "Exists operator",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   `JSON_EXISTS(body, '$."http"."status_code"')`,
			expectedError: nil,
		},
		{
			name: "Not Exists operator",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   `NOT JSON_EXISTS(body, '$."http"."status_code"')`,
			expectedError: nil,
		},
		{
			name: "Greater than operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         "200",
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') > ?`,
			expectedError: nil,
		},
		{
			name: "Greater than operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         200,
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') > ?`,
			expectedError: nil,
		},
		{
			name: "Less than operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         "300",
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') < ?`,
			expectedError: nil,
		},
		{
			name: "Less than operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         300,
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') < ?`,
			expectedError: nil,
		},
		{
			name: "Contains operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         "200",
			expectedSQL:   `LOWER(JSON_VALUE(body, '$."http"."status_code"')) LIKE LOWER(?)`,
			expectedError: nil,
		},
		{
			name: "Not Contains operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorNotContains,
			value:         "200",
			expectedSQL:   `LOWER(JSON_VALUE(body, '$."http"."status_code"')) NOT LIKE LOWER(?)`,
			expectedError: nil,
		},
		{
			name: "Between operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{"200", "300"},
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') BETWEEN ? AND ?`,
			expectedError: nil,
		},
		{
			name: "Between operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{400, 500},
			expectedSQL:   `JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') BETWEEN ? AND ?`,
			expectedError: nil,
		},
		{
			name: "In operator - string",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"200", "300"},
			expectedSQL:   `(JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') = ? OR JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') = ?)`,
			expectedError: nil,
		},
		{
			name: "In operator - int64",
			key: telemetrytypes.TelemetryFieldKey{
				Name: "body.http.status_code",
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{401, 404, 500},
			expectedSQL:   `(JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') = ? OR JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') = ? OR JSONExtract(JSON_VALUE(body, '$."http"."status_code"'), 'Int64') = ?)`,
			expectedError: nil,
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
            cond, err := conditionBuilder.ConditionFor(ctx, &tc.key, tc.operator, tc.value, sb, 0, 0)
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
