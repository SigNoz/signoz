package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFormatScalarResultsAsTableDuplicateIssue reproduces the exact issue from the user's JSON
func TestFormatScalarResultsAsTableDuplicateIssue(t *testing.T) {
	q := &querier{}
	
	// Create results that exactly match the user's problematic case
	// Query A has data for all services
	// Query B also has data for all services
	// But they're coming as separate ScalarData results
	results := map[string]*qbtypes.Result{
		"A": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
						QueryName:         "B", // Note: This says "B" in the user's JSON!
						Type:              qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"},
						QueryName:         "A",
						AggregationIndex:  0,
						Type:              qbtypes.ColumnTypeAggregation,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_1"},
						QueryName:         "A",
						AggregationIndex:  1,
						Type:              qbtypes.ColumnTypeAggregation,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"},
						QueryName:         "B",
						AggregationIndex:  0,
						Type:              qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					// These rows have values for A but "n/a" for B
					{"currencyservice", 3380.0, 1.0, "n/a"},
					{"producer-svc-3", 25.0, 1.0, "n/a"},
					{"producer-svc-5", 45.0, 1.0, "n/a"},
					{"mongodb", 5713.0, 1.0, "n/a"},
					{"recommendationservice", 1724.0, 1.0, "n/a"},
					{"producer-svc-1", 180.0, 1.0, "n/a"},
					{"consumer-svc-4", 210.0, 1.0, "n/a"},
					{"frauddetectionservice", 101.0, 1.0, "n/a"},
					{"kafka", 1376.0, 1.0, "n/a"},
					{"consumer-svc-3", 122.0, 1.0, "n/a"},
					{"producer-svc-6", 60.0, 1.0, "n/a"},
					{"cartservice", 3322.0, 1.0, "n/a"},
					{"consumer-svc-2", 1080.0, 1.0, "n/a"},
					{"adservice", 133.0, 1.0, "n/a"},
					{"demo-app", 1449.0, 1.0, "n/a"},
					{"quoteservice", 101.0, 1.0, "n/a"},
					{"producer-svc-2", 360.0, 1.0, "n/a"},
					{"producer-svc-4", 36.0, 1.0, "n/a"},
					// These rows have "n/a" for A but values for B
					{"consumer-svc-4", "n/a", "n/a", 1.0},
					{"currencyservice", "n/a", "n/a", 1.0},
					{"producer-svc-4", "n/a", "n/a", 1.0},
					{"producer-svc-2", "n/a", "n/a", 1.0},
					{"producer-svc-3", "n/a", "n/a", 1.0},
					{"adservice", "n/a", "n/a", 1.0},
					{"kafka", "n/a", "n/a", 1.0},
					{"frauddetectionservice", "n/a", "n/a", 1.0},
					{"recommendationservice", "n/a", "n/a", 1.0},
					{"consumer-svc-3", "n/a", "n/a", 1.0},
					{"consumer-svc-2", "n/a", "n/a", 1.0},
					{"cartservice", "n/a", "n/a", 1.0},
					{"quoteservice", "n/a", "n/a", 1.0},
					{"producer-svc-5", "n/a", "n/a", 1.0},
					{"demo-app", "n/a", "n/a", 1.0},
					{"mongodb", "n/a", "n/a", 1.0},
					{"producer-svc-6", "n/a", "n/a", 1.0},
					{"producer-svc-1", "n/a", "n/a", 1.0},
				},
			},
		},
	}
	
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "A",
					},
				},
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "B",
					},
				},
			},
		},
	}
	
	// Format as table
	result := q.formatScalarResultsAsTable(results, req)
	
	// Get the table - it should be under "A" key now
	var table *qbtypes.ScalarData
	var ok bool
	if tableResult, exists := result["A"]; exists {
		table, ok = tableResult.(*qbtypes.ScalarData)
	} else if tableResult, exists := result["table"]; exists {
		table, ok = tableResult.(*qbtypes.ScalarData)
	}
	require.True(t, ok, "Expected table result, got: %+v", result)
	
	// The problem: we should have 18 unique services, not 36 rows
	assert.Len(t, table.Data, 18, "Should have 18 unique services, not duplicate rows")
	
	// Create a map to check row values by service name
	rowMap := make(map[string][]any)
	for _, row := range table.Data {
		serviceName := row[0].(string)
		assert.NotContains(t, rowMap, serviceName, "Service %s should not appear twice", serviceName)
		rowMap[serviceName] = row
	}
	
	// Check some specific services that appear in both lists
	// currencyservice should have values from both A and B
	currencyRow := rowMap["currencyservice"]
	assert.Equal(t, "currencyservice", currencyRow[0])
	assert.Equal(t, 3380.0, currencyRow[1]) // A result 0
	assert.Equal(t, 1.0, currencyRow[2])    // A result 1
	assert.Equal(t, 1.0, currencyRow[3])    // B result 0
}

// TestFormatScalarResultsAsTableSingleResultAlreadyMerged tests the case where 
// a single result already contains all columns from multiple queries
func TestFormatScalarResultsAsTableSingleResultAlreadyMerged(t *testing.T) {
	q := &querier{}
	
	// This is what we're actually getting - a single result that already has columns from both queries
	results := map[string]*qbtypes.Result{
		"merged": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
						QueryName:         "B",
						Type:              qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"},
						QueryName:         "A",
						AggregationIndex:  0,
						Type:              qbtypes.ColumnTypeAggregation,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_1"},
						QueryName:         "A",
						AggregationIndex:  1,
						Type:              qbtypes.ColumnTypeAggregation,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"},
						QueryName:         "B",
						AggregationIndex:  0,
						Type:              qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"currencyservice", 3380.0, 1.0, "n/a"},
					{"mongodb", 5713.0, 1.0, "n/a"},
					{"currencyservice", "n/a", "n/a", 1.0},
					{"mongodb", "n/a", "n/a", 1.0},
				},
			},
		},
	}
	
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "A",
					},
				},
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "B",
					},
				},
			},
		},
	}
	
	// Format as table
	result := q.formatScalarResultsAsTable(results, req)
	
	// Get the table - it should be under "merged" key now
	var table *qbtypes.ScalarData
	var ok bool
	if tableResult, exists := result["merged"]; exists {
		table, ok = tableResult.(*qbtypes.ScalarData)
	} else if tableResult, exists := result["table"]; exists {
		table, ok = tableResult.(*qbtypes.ScalarData)
	}
	require.True(t, ok, "Expected table result, got: %+v", result)
	
	// Should have 2 unique services, not 4 rows
	assert.Len(t, table.Data, 2, "Should have 2 unique services after merging duplicates")
	
	// Create a map to check row values by service name
	rowMap := make(map[string][]any)
	for _, row := range table.Data {
		serviceName := row[0].(string)
		rowMap[serviceName] = row
	}
	
	// Check that values are properly merged
	currencyRow := rowMap["currencyservice"]
	assert.Equal(t, "currencyservice", currencyRow[0])
	assert.Equal(t, 3380.0, currencyRow[1]) // A result 0
	assert.Equal(t, 1.0, currencyRow[2])    // A result 1
	assert.Equal(t, 1.0, currencyRow[3])    // B result 0
	
	mongoRow := rowMap["mongodb"]
	assert.Equal(t, "mongodb", mongoRow[0])
	assert.Equal(t, 5713.0, mongoRow[1]) // A result 0
	assert.Equal(t, 1.0, mongoRow[2])    // A result 1
	assert.Equal(t, 1.0, mongoRow[3])    // B result 0
}