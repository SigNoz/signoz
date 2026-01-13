package queryparser

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/queryparser/queryfilterextractor"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/require"
)

func TestBaseRule_ExtractMetricAndGroupBys(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name        string
		payload     string
		wantResults map[string]*queryfilterextractor.FilterResult
	}{
		{
			name:    "builder multiple grouping",
			payload: builderQueryWithGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"A": {
					MetricNames: []string{"test_metric_cardinality", "cpu_usage_total"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "service_name", Alias: "service_name", OriginExpr: "service_name", OriginField: "service_name"},
						{Name: "env", Alias: "env", OriginExpr: "env", OriginField: "env"},
					},
				},
			},
		},
		{
			name:    "builder single grouping",
			payload: builderQuerySingleGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"B": {
					MetricNames: []string{"latency_p50"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "namespace", Alias: "namespace", OriginExpr: "namespace", OriginField: "namespace"},
					},
				},
			},
		},
		{
			name:    "builder no grouping",
			payload: builderQueryNoGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"C": {
					MetricNames:    []string{"disk_usage_total"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
			},
		},
		{
			name:    "promql multiple grouping",
			payload: promQueryWithGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"P1": {
					MetricNames: []string{"http_requests_total"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "pod", Alias: "", OriginExpr: "pod", OriginField: "pod"},
						{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
					},
				},
			},
		},
		{
			name:    "promql single grouping",
			payload: promQuerySingleGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"P2": {
					MetricNames: []string{"cpu_usage_seconds_total"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "env", Alias: "", OriginExpr: "env", OriginField: "env"},
					},
				},
			},
		},
		{
			name:    "promql no grouping",
			payload: promQueryNoGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"P3": {
					MetricNames:    []string{"node_cpu_seconds_total"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
			},
		},
		{
			name:    "clickhouse multiple grouping",
			payload: clickHouseQueryWithGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"CH1": {
					MetricNames: []string{"cpu"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
						{Name: "zone", Alias: "", OriginExpr: "zone", OriginField: "zone"},
					},
				},
			},
		},
		{
			name:    "clickhouse single grouping",
			payload: clickHouseQuerySingleGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"CH2": {
					MetricNames: []string{"cpu_usage"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
					},
				},
			},
		},
		{
			name:    "clickhouse no grouping",
			payload: clickHouseQueryNoGrouping,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"CH3": {
					MetricNames:    []string{"memory_usage"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
			},
		},
		{
			name:    "builder formula for builder queries",
			payload: builderQueryWithFormula,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"A": {
					MetricNames:    []string{"cpu_usage"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
				"B": {
					MetricNames:    []string{"mem_usage"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
				"F1": {
					MetricNames:    []string{"cpu_usage", "mem_usage"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
			},
		},
		{
			name:    "builder formula with group by",
			payload: builderQueryWithFormulaAndGroupBy,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"A": {
					MetricNames: []string{"cpu"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "host", Alias: "host", OriginExpr: "host", OriginField: "host"},
						{Name: "region", Alias: "region", OriginExpr: "region", OriginField: "region"},
					},
				},
				"B": {
					MetricNames: []string{"mem"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "host", Alias: "host", OriginExpr: "host", OriginField: "host"},
						{Name: "instance", Alias: "instance", OriginExpr: "instance", OriginField: "instance"},
					},
				},
				"F1": {
					MetricNames: []string{"cpu", "mem"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{
						{Name: "host", Alias: "host", OriginExpr: "host", OriginField: "host"},
						{Name: "instance", Alias: "instance", OriginExpr: "instance", OriginField: "instance"},
						{Name: "region", Alias: "region", OriginExpr: "region", OriginField: "region"},
					},
				},
			},
		},
		{
			name:    "builder formula referencing same query multiple times",
			payload: builderQueryWithFormulaSameQuery,
			wantResults: map[string]*queryfilterextractor.FilterResult{
				"A": {
					MetricNames:    []string{"disk_used"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
				"F1": {
					MetricNames:    []string{"disk_used"},
					GroupByColumns: []queryfilterextractor.ColumnInfo{},
				},
			},
		},
	}

	queryParser := New(instrumentationtest.New().ToProviderSettings())

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queryEnvelopes := mustCompositeQueryEnvelope(t, tt.payload)
			results, err := queryParser.AnalyzeQueryEnvelopes(ctx, queryEnvelopes)
			require.NoError(t, err)
			require.Len(t, results, len(queryEnvelopes), "number of results should match number of queries")

			// Check each expected query result
			for queryName, expectedResult := range tt.wantResults {
				result, ok := results[queryName]
				require.True(t, ok, "query %s should be present in results", queryName)
				require.ElementsMatch(t, expectedResult.MetricNames, result.MetricNames, "metrics mismatch for query %s", queryName)
				require.ElementsMatch(t, expectedResult.GroupByColumns, result.GroupByColumns, "group by columns mismatch for query %s", queryName)
			}
		})
	}
}

func mustCompositeQueryEnvelope(t *testing.T, payload string) []qbtypes.QueryEnvelope {
	t.Helper()
	var queryEnvelopes []qbtypes.QueryEnvelope
	require.NoError(t, json.Unmarshal([]byte(payload), &queryEnvelopes))
	return queryEnvelopes
}
