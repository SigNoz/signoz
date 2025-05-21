package telemetrytests

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

// TestAggRewrite tests rewrite set of aggregation expressions
func TestAggRewrite(t *testing.T) {
	fm := telemetrytraces.NewFieldMapper()
	cb := telemetrytraces.NewConditionBuilder(fm)

	// Define a comprehensive set of field keys to support all test cases
	keys := buildCompleteFieldKeyMap()

	opts := querybuilder.AggExprRewriterOptions{
		FieldMapper:      fm,
		ConditionBuilder: cb,
		FieldKeys:        keys,
		FullTextColumn: &telemetrytypes.TelemetryFieldKey{
			Name: "body",
		},
		JsonBodyPrefix: "body",
		JsonKeyToKey:   telemetrylogs.GetBodyJSONKey,
		RateInterval:   60,
	}

	testCases := []struct {
		expr                  string
		shouldPass            bool
		expectedExpr          string
		expectedArgs          []any
		expectedErrorContains string
	}{
		{
			expr:         "count()",
			shouldPass:   true,
			expectedExpr: "count()",
		},
		{
			expr:         `countIf(service.name = "redis")`,
			shouldPass:   true,
			expectedExpr: "countIf((resources_string['service.name'] = ? AND mapContains(resources_string, 'service.name') = ?))",
			expectedArgs: []any{"redis", true},
		},
		{
			expr:         `countIf(service.name = "redis" AND status = 200)`,
			shouldPass:   true,
			expectedExpr: "countIf(((resources_string['service.name'] = ? AND mapContains(resources_string, 'service.name') = ?) AND (attributes_number['status'] = ? AND mapContains(attributes_number, 'status') = ?)))",
			expectedArgs: []any{"redis", true, float64(200), true},
		},
		{
			expr:         `p05(duration_nano)`,
			shouldPass:   true,
			expectedExpr: "quantile(0.05)(duration_nano)",
		},
		{
			expr:         `rate()`,
			shouldPass:   true,
			expectedExpr: "count()/60",
		},
		{
			expr:         `avg(duration_nano)`,
			shouldPass:   true,
			expectedExpr: "avg(duration_nano)",
		},
		{
			expr:         `sum(total_orders)`,
			shouldPass:   true,
			expectedExpr: "sum(attributes_number['total_orders'])",
		},
	}

	rewriter := querybuilder.NewAggExprRewriter(opts)

	for _, tc := range testCases {
		t.Run(limitString(tc.expr, 50), func(t *testing.T) {
			expr, args, err := rewriter.Rewrite(tc.expr)
			if tc.shouldPass {
				if err != nil {
					t.Errorf("Failed to parse query: %s\nError: %v\n", tc.expr, err)
					return
				}
				// Build the SQL and print it for debugging
				require.Equal(t, tc.expectedExpr, expr)
				require.Equal(t, tc.expectedArgs, args)
			} else {
				require.Error(t, err, "Expected error for query: %s", tc.expr)
				require.Contains(t, err.Error(), tc.expectedErrorContains)
			}
		})
	}
}
