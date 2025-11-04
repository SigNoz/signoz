package telemetrymetrics

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
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "http.server.duration",
			expectedSQL:   "metric_name = ?",
			expectedArgs:  []any{"http.server.duration"},
			expectedError: nil,
		},
		{
			name: "Not Equal operator - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         "http.server.duration",
			expectedSQL:   "metric_name <> ?",
			expectedArgs:  []any{"http.server.duration"},
			expectedError: nil,
		},
		{
			name: "Like operator - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         "%error%",
			expectedSQL:   "metric_name LIKE ?",
			expectedArgs:  []any{"%error%"},
			expectedError: nil,
		},
		{
			name: "Not Like operator - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorNotLike,
			value:         "%error%",
			expectedSQL:   "metric_name NOT LIKE ?",
			expectedArgs:  []any{"%error%"},
			expectedError: nil,
		},
		{
			name: "ILike operator - string label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorILike,
			value:         "%admin%",
			expectedSQL:   "LOWER(JSONExtractString(labels, 'user.id')) LIKE LOWER(?)",
			expectedArgs:  []any{"%admin%"},
			expectedError: nil,
		},
		{
			name: "Not ILike operator - string label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotILike,
			value:         "%admin%",
			expectedSQL:   "LOWER(JSONExtractString(labels, 'user.id')) NOT LIKE LOWER(?)",
			expectedArgs:  []any{"%admin%"},
			expectedError: nil,
		},
		{
			name: "Contains operator - string label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         "admin",
			expectedSQL:   "LOWER(JSONExtractString(labels, 'user.id')) LIKE LOWER(?)",
			expectedArgs:  []any{"%admin%"},
			expectedError: nil,
		},
		{
			name: "In operator - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"http.server.duration", "http.server.request.duration", "http.server.response.duration"},
			expectedSQL:   "metric_name IN (?)",
			expectedArgs:  []any{[]any{"http.server.duration", "http.server.request.duration", "http.server.response.duration"}},
			expectedError: nil,
		},
		{
			name: "In operator - invalid value",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         "error",
			expectedSQL:   "",
			expectedError: qbtypes.ErrInValues,
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
			expectedSQL:   "LOWER(JSONExtractString(labels, 'user.id')) LIKE LOWER(?)",
			expectedArgs:  []any{"%521509198310%"},
			expectedError: nil,
		},
		{
			name: "Not In operator - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorNotIn,
			value:         []any{"debug", "info", "trace"},
			expectedSQL:   "metric_name NOT IN (?)",
			expectedArgs:  []any{[]any{"debug", "info", "trace"}},
			expectedError: nil,
		},
		{
			name: "Exists operator - string field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "true",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - string field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "true",
			expectedError: nil,
		},
		{
			name: "Exists operator - type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "type",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "true",
			expectedError: nil,
		},
		{
			name: "Exists operator - string label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "has(JSONExtractKeys(labels), 'user.id')",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - string label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "not has(JSONExtractKeys(labels), 'user.id')",
			expectedError: nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextMetric,
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
					Name:         "metric_name",
					FieldContext: telemetrytypes.FieldContextMetric,
				},
				{
					Name:         "type",
					FieldContext: telemetrytypes.FieldContextMetric,
				},
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "error message",
			expectedSQL:   "metric_name = ? AND type = ?",
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
