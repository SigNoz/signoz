package resourcefilter

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConditionBuilder(t *testing.T) {

	testCases := []struct {
		name         string
		key          *telemetrytypes.TelemetryFieldKey
		op           querybuildertypesv5.FilterOperator
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
			op:           querybuildertypesv5.FilterOperatorEqual,
			value:        "watch",
			expected:     "simpleJSONExtractString(labels, 'k8s.namespace.name') = ? AND labels LIKE ? AND labels LIKE ?",
			expectedArgs: []any{"watch", "%k8s.namespace.name%", `%k8s.namespace.name%watch%`},
		},
		{
			name: "string_not_equal",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorNotEqual,
			value:        "redis",
			expected:     "simpleJSONExtractString(labels, 'k8s.namespace.name') <> ? AND labels NOT LIKE ?",
			expectedArgs: []any{"redis", `%k8s.namespace.name%redis%`},
		},
		{
			name: "string_like",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorLike,
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
			op:           querybuildertypesv5.FilterOperatorNotLike,
			value:        "_mango%",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) NOT LIKE LOWER(?) AND LOWER(labels) NOT LIKE LOWER(?)",
			expectedArgs: []any{"_mango%", `%k8s.namespace.name%_mango%%`},
		},
		{
			name: "string_contains",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorContains,
			value:        "banana",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) LIKE LOWER(?) AND labels LIKE ? AND LOWER(labels) LIKE LOWER(?)",
			expectedArgs: []any{"%banana%", "%k8s.namespace.name%", `%k8s.namespace.name%banana%`},
		},
		{
			name: "string_not_contains",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorNotContains,
			value:        "banana",
			expected:     "LOWER(simpleJSONExtractString(labels, 'k8s.namespace.name')) NOT LIKE LOWER(?) AND LOWER(labels) NOT LIKE LOWER(?)",
			expectedArgs: []any{"%banana%", `%k8s.namespace.name%banana%`},
		},
		{
			name: "string_in",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorIn,
			value:        []any{"watch", "redis"},
			expected:     "(simpleJSONExtractString(labels, 'k8s.namespace.name') = ? OR simpleJSONExtractString(labels, 'k8s.namespace.name') = ?) AND labels LIKE ? AND (labels LIKE ? OR labels LIKE ?)",
			expectedArgs: []any{"watch", "redis", "%k8s.namespace.name%", "%k8s.namespace.name%watch%", "%k8s.namespace.name%redis%"},
		},
		{
			name: "string_not_in",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorNotIn,
			value:        []any{"watch", "redis"},
			expected:     "(simpleJSONExtractString(labels, 'k8s.namespace.name') <> ? AND simpleJSONExtractString(labels, 'k8s.namespace.name') <> ?) AND (labels NOT LIKE ? AND labels NOT LIKE ?)",
			expectedArgs: []any{"watch", "redis", "%k8s.namespace.name%watch%", "%k8s.namespace.name%redis%"},
		},
		{
			name: "string_exists",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorExists,
			expected:     "simpleJSONHas(labels, 'k8s.namespace.name') = ? AND labels LIKE ?",
			expectedArgs: []any{true, "%k8s.namespace.name%"},
		},
		{
			name: "string_not_exists",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "k8s.namespace.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			op:           querybuildertypesv5.FilterOperatorNotExists,
			expected:     "simpleJSONHas(labels, 'k8s.namespace.name') <> ?",
			expectedArgs: []any{true},
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.ConditionFor(context.Background(), tc.key, tc.op, tc.value, sb)
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
