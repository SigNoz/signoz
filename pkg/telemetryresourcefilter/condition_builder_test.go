package telemetryresourcefilter

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConditionBuilder(t *testing.T) {

	testCases := []struct {
		name         string
		key          *telemetrytypes.TelemetryFieldKey
		op           qbtypes.FilterOperator
		value        any
		expected     string
		expectedArgs []any
		expectedErr  error
	}{
		{
			name: "string_equal",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorEqual,
			value:        "watch",
			expected:     "simpleJSONExtractString(labels, 'k8s.namespace.name') = ? AND labels LIKE ? AND labels LIKE ?",
			expectedArgs: []any{"watch", "%k8s.namespace.name%", `%k8s.namespace.name":"watch%`},
		},
		{
			name: "string_not_equal",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorNotEqual,
			value:        "redis",
			expected:     "simpleJSONExtractString(labels, 'k8s.namespace.name') <> ? AND labels NOT LIKE ?",
			expectedArgs: []any{"redis", `%k8s.namespace.name":"redis%`},
		},
		{
			name: "string_like",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorLike,
			value:        "_mango%",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) LIKE LOWER(?) AND labels LIKE ? AND LOWER(labels) LIKE LOWER(?)",
			expectedArgs: []any{"_mango%", "%k8s.namespace.name%", `%k8s.namespace.name%_mango%%`},
		},
		{
			name: "string_not_like",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorNotLike,
			value:        "_mango%",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) NOT LIKE LOWER(?)",
			expectedArgs: []any{"_mango%"},
		},
		{
			name: "string_contains",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorContains,
			value:        "banana",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) LIKE LOWER(?) AND labels LIKE ? AND LOWER(labels) LIKE LOWER(?)",
			expectedArgs: []any{"%banana%", "%k8s.namespace.name%", `%k8s.namespace.name%banana%`},
		},
		{
			name: "Contains operator - string attribute number value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "company.id",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			op:           qbtypes.FilterOperatorContains,
			value:        521509198310,
			expected:     "LOWER(simpleJSONExtractString(labels, 'company.id')) LIKE LOWER(?) AND labels LIKE ? AND LOWER(labels) LIKE LOWER(?)",
			expectedArgs: []any{"%521509198310%", "%company.id%", `%company.id%521509198310%`},
		},
		{
			name: "string_not_contains",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorNotContains,
			value:        "banana",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) NOT LIKE LOWER(?)",
			expectedArgs: []any{"%banana%"},
		},
		{
			name: "string_in",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorIn,
			value:        []any{"watch", "redis"},
			expected:     "(simpleJSONExtractString(labels, 'k8s.namespace.name') = ? OR simpleJSONExtractString(labels, 'k8s.namespace.name') = ?) AND labels LIKE ? AND (labels LIKE ? OR labels LIKE ?)",
			expectedArgs: []any{"watch", "redis", "%k8s.namespace.name%", "%k8s.namespace.name\":\"watch%", "%k8s.namespace.name\":\"redis%"},
		},
		{
			name: "string_not_in",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorNotIn,
			value:        []any{"watch", "redis"},
			expected:     "(simpleJSONExtractString(labels, 'k8s.namespace.name') <> ? AND simpleJSONExtractString(labels, 'k8s.namespace.name') <> ?) AND (labels NOT LIKE ? AND labels NOT LIKE ?)",
			expectedArgs: []any{"watch", "redis", "%k8s.namespace.name\":\"watch%", "%k8s.namespace.name\":\"redis%"},
		},
		{
			name: "string_exists",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorExists,
			expected:     "simpleJSONHas(labels, 'k8s.namespace.name') = ? AND labels LIKE ?",
			expectedArgs: []any{true, "%k8s.namespace.name%"},
		},
		{
			name: "string_not_exists",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorNotExists,
			expected:     "simpleJSONHas(labels, 'k8s.namespace.name') <> ?",
			expectedArgs: []any{true},
		},
		{
			name: "number_equals",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "test_num",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorEqual,
			value:        1,
			expected:     "simpleJSONExtractString(labels, 'test_num') = ? AND labels LIKE ? AND labels LIKE ?",
			expectedArgs: []any{"1", "%test_num%", "%test_num\":\"1%"},
		},
		{
			name: "number_gt",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "test_num",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorGreaterThan,
			value:        1,
			expected:     "simpleJSONExtractString(labels, 'test_num') > ? AND labels LIKE ?",
			expectedArgs: []any{"1", "%test_num%"},
		},
		{
			name: "number_in",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "test_num",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorIn,
			value:        []any{1, 2},
			expected:     "(simpleJSONExtractString(labels, 'test_num') = ? OR simpleJSONExtractString(labels, 'test_num') = ?) AND labels LIKE ? AND (labels LIKE ? OR labels LIKE ?)",
			expectedArgs: []any{"1", "2", "%test_num%", "%test_num\":\"1%", "%test_num\":\"2%"},
		},
		{
			name: "number_between",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "test_num",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorBetween,
			value:        []any{1, 2},
			expected:     "labels LIKE ? AND simpleJSONExtractString(labels, 'test_num') BETWEEN ? AND ?",
			expectedArgs: []any{"%test_num%", "1", "2"},
		},
		{
			name: "string_regexp",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           qbtypes.FilterOperatorRegexp,
			value:        "ban.*",
			expected:     "match(simpleJSONExtractString(labels, 'k8s.namespace.name'), ?) AND labels LIKE ?",
			expectedArgs: []any{"ban.*", "%k8s.namespace.name%"},
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.ConditionFor(context.Background(), 0, 0, tc.key, tc.op, tc.value, sb)
			sb.Where(cond)

			if tc.expectedErr != nil {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				assert.Contains(t, sql, tc.expected)
				assert.Equal(t, tc.expectedArgs, args)
			}
		})
	}
}
