package telemetrylogs

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHavingExpressionRewriter_LogQueries(t *testing.T) {
	tests := []struct {
		name               string
		havingExpression   string
		aggregations       []qbtypes.LogAggregation
		expectedExpression string
		wantErr            bool
	}{
		{
			name:             "single aggregation with alias",
			havingExpression: "total_logs > 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			expectedExpression: "__result_0 > 1000",
		},
		{
			name:             "multiple aggregations with complex expression",
			havingExpression: "(total > 100 AND avg_duration < 500) OR total > 10000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
				{Expression: "avg(duration)", Alias: "avg_duration"},
			},
			expectedExpression: "(__result_0 > 100 AND __result_1 < 500) OR __result_0 > 10000",
		},
		{
			name:             "__result reference for single aggregation",
			havingExpression: "__result > 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: ""},
			},
			expectedExpression: "__result_0 > 500",
		},
		{
			name:             "expression reference",
			havingExpression: "sum(bytes) > 1024000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(bytes)", Alias: ""},
			},
			expectedExpression: "__result_0 > 1024000",
		},
		{
			name:             "__result{number} format",
			havingExpression: "__result0 > 100 AND __result1 < 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: ""},
				{Expression: "sum(bytes)", Alias: ""},
			},
			expectedExpression: "__result_0 > 100 AND __result_1 < 1000",
		},
		{
			name:             "mixed aliases and expressions",
			havingExpression: "error_count > 10 AND count() < 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: ""},
				{Expression: "countIf(level='error')", Alias: "error_count"},
			},
			expectedExpression: "__result_1 > 10 AND __result_0 < 1000",
		},
		{
			name:             "string literal in having expression",
			havingExpression: "count() > 'threshold'",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: ""},
			},
			wantErr: true,
		},
		{
			name:             "unknown reference",
			havingExpression: "no_such_alias > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			result, err := rewriter.RewriteForLogs(tt.havingExpression, tt.aggregations)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expectedExpression, result)
			}
		})
	}
}
