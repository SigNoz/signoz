package telemetrytraces

import (
	"reflect"
	"testing"

	parser "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestRewrite(t *testing.T) {

	cases := []struct {
		name           string
		expr           string
		expected       string
		expectedChArgs []any
	}{
		{
			name:           "check simple count",
			expr:           "count()",
			expected:       "count()",
			expectedChArgs: []any{},
		},
		{
			name:           "check count with status code",
			expr:           "countIf(status_code = 200)",
			expected:       "countIf((attributes_number['status_code'] = ?))",
			expectedChArgs: []any{float64(200)},
		},
		{
			name:           "avg of duration_nano",
			expr:           "avg(duration_nano)",
			expected:       "avg(duration_nano)",
			expectedChArgs: []any{},
		},
		{
			name:           "error rate",
			expr:           "countIf(has_error = true) / count()",
			expected:       "countIf((has_error = ?)) / count()",
			expectedChArgs: []any{true},
		},
		{
			name:           "quantity",
			expr:           "avg(quantity)",
			expected:       "avg(attributes_number['quantity'])",
			expectedChArgs: []any{},
		},
		{
			name:           "number materialized",
			expr:           "sum(item.price)",
			expected:       "sum(attribute_number_item$$price)",
			expectedChArgs: []any{},
		},
	}

	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"status_code": {
			{
				Name:          "status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"has_error": {
			{
				Name:          "has_error",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"http.route": {
			{
				Name:          "http.route",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"duration_nano": {
			{
				Name:          "duration_nano",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"quantity": {
			{
				Name:          "quantity",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"item.price": {
			{
				Name:          "item.price",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Materialized:  true,
			},
		},
	}
	fullTextColumn := &telemetrytypes.TelemetryFieldKey{}

	aggRewriter := parser.DefaultAggExprRewriter

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rewritten, chArgs, err := aggRewriter.Rewrite(c.expr, fieldKeys, fullTextColumn, DefaultFieldMapper, DefaultConditionBuilder, "", nil)
			if err != nil {
				t.Fatalf("failed to rewrite expression %q: %v", c.expr, err)
			}
			if rewritten != c.expected {
				t.Errorf("expected rewritten expression %q, got %q", c.expected, rewritten)
			}
			if len(chArgs) != len(c.expectedChArgs) {
				t.Errorf("expected %d chArgs, got %d", len(c.expectedChArgs), len(chArgs))
			}
			for i, chArg := range chArgs {
				if !reflect.DeepEqual(chArg, c.expectedChArgs[i]) {
					t.Errorf("expected chArg %v, got %v", c.expectedChArgs[i], chArg)
				}
			}
		})
	}
}
