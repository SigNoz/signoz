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
		wantMetrics []string
		wantGroupBy []queryfilterextractor.ColumnInfo
	}{
		{
			name:        "builder multiple grouping",
			payload:     builderQueryWithGrouping,
			wantMetrics: []string{"test_metric_cardinality", "cpu_usage_total"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{
				{Name: "service_name", Alias: "", OriginExpr: "service_name", OriginField: "service_name"},
				{Name: "env", Alias: "", OriginExpr: "env", OriginField: "env"},
			},
		},
		{
			name:        "builder single grouping",
			payload:     builderQuerySingleGrouping,
			wantMetrics: []string{"latency_p50"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{
				{Name: "namespace", Alias: "", OriginExpr: "namespace", OriginField: "namespace"},
			},
		},
		{
			name:        "builder no grouping",
			payload:     builderQueryNoGrouping,
			wantMetrics: []string{"disk_usage_total"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{},
		},
		{
			name:        "promql multiple grouping",
			payload:     promQueryWithGrouping,
			wantMetrics: []string{"http_requests_total"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{
				{Name: "pod", Alias: "", OriginExpr: "pod", OriginField: "pod"},
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "promql single grouping",
			payload:     promQuerySingleGrouping,
			wantMetrics: []string{"cpu_usage_seconds_total"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{
				{Name: "env", Alias: "", OriginExpr: "env", OriginField: "env"},
			},
		},
		{
			name:        "promql no grouping",
			payload:     promQueryNoGrouping,
			wantMetrics: []string{"node_cpu_seconds_total"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{},
		},
		{
			name:        "clickhouse multiple grouping",
			payload:     clickHouseQueryWithGrouping,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
				{Name: "zone", Alias: "", OriginExpr: "zone", OriginField: "zone"},
			},
		},
		{
			name:        "clickhouse single grouping",
			payload:     clickHouseQuerySingleGrouping,
			wantMetrics: []string{"cpu_usage"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "clickhouse no grouping",
			payload:     clickHouseQueryNoGrouping,
			wantMetrics: []string{"memory_usage"},
			wantGroupBy: []queryfilterextractor.ColumnInfo{},
		},
	}

	queryParser := New(instrumentationtest.New().ToProviderSettings())

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queryEnvelopes := mustCompositeQueryEnvelope(t, tt.payload)
			results, err := queryParser.AnalyzeQueryEnvelopes(ctx, queryEnvelopes)
			require.NoError(t, err)
			require.Len(t, results, len(queryEnvelopes), "number of results should match number of queries")
			for _, result := range results {
				require.ElementsMatch(t, tt.wantMetrics, result.MetricNames)
				require.ElementsMatch(t, tt.wantGroupBy, result.GroupByColumns)
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
