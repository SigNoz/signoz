package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFormatScalarResultsAsTableMergesCorrectly(t *testing.T) {
	q := &querier{}
	
	// Create results that simulate the problematic case
	results := map[string]*qbtypes.Result{
		"A": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
						QueryName:         "A",
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
				},
				Data: [][]any{
					{"currencyservice", 3380.0, 1.0},
					{"mongodb", 5713.0, 1.0},
					{"cartservice", 3322.0, 1.0},
				},
			},
		},
		"B": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
						QueryName:         "B",
						Type:              qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"},
						QueryName:         "B",
						AggregationIndex:  0,
						Type:              qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"currencyservice", 1.0},
					{"mongodb", 1.0},
					{"cartservice", 1.0},
					{"kafka", 1.0}, // Service only in B
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
	
	// Get the table
	table, ok := result["table"].(*qbtypes.ScalarData)
	require.True(t, ok)
	
	// Should have 5 columns: 1 group + 2 from A + 1 from B
	assert.Len(t, table.Columns, 4)
	
	// Check column names and query associations
	assert.Equal(t, "service.name", table.Columns[0].Name)
	assert.Equal(t, qbtypes.ColumnTypeGroup, table.Columns[0].Type)
	
	assert.Equal(t, "__result_0", table.Columns[1].Name)
	assert.Equal(t, "A", table.Columns[1].QueryName)
	assert.Equal(t, qbtypes.ColumnTypeAggregation, table.Columns[1].Type)
	
	assert.Equal(t, "__result_1", table.Columns[2].Name)
	assert.Equal(t, "A", table.Columns[2].QueryName)
	assert.Equal(t, qbtypes.ColumnTypeAggregation, table.Columns[2].Type)
	
	assert.Equal(t, "__result_0", table.Columns[3].Name)
	assert.Equal(t, "B", table.Columns[3].QueryName)
	assert.Equal(t, qbtypes.ColumnTypeAggregation, table.Columns[3].Type)
	
	// Should have 4 rows (one for each unique service)
	assert.Len(t, table.Data, 4)
	
	// Create a map to check row values by service name
	rowMap := make(map[string][]any)
	for _, row := range table.Data {
		serviceName := row[0].(string)
		rowMap[serviceName] = row
	}
	
	// Check currencyservice row
	currencyRow := rowMap["currencyservice"]
	assert.Equal(t, "currencyservice", currencyRow[0])
	assert.Equal(t, 3380.0, currencyRow[1]) // A result 0
	assert.Equal(t, 1.0, currencyRow[2])    // A result 1
	assert.Equal(t, 1.0, currencyRow[3])    // B result 0
	
	// Check mongodb row
	mongoRow := rowMap["mongodb"]
	assert.Equal(t, "mongodb", mongoRow[0])
	assert.Equal(t, 5713.0, mongoRow[1]) // A result 0
	assert.Equal(t, 1.0, mongoRow[2])    // A result 1
	assert.Equal(t, 1.0, mongoRow[3])    // B result 0
	
	// Check cartservice row
	cartRow := rowMap["cartservice"]
	assert.Equal(t, "cartservice", cartRow[0])
	assert.Equal(t, 3322.0, cartRow[1]) // A result 0
	assert.Equal(t, 1.0, cartRow[2])    // A result 1
	assert.Equal(t, 1.0, cartRow[3])    // B result 0
	
	// Check kafka row (only in B)
	kafkaRow := rowMap["kafka"]
	assert.Equal(t, "kafka", kafkaRow[0])
	assert.Equal(t, "n/a", kafkaRow[1]) // A result 0
	assert.Equal(t, "n/a", kafkaRow[2]) // A result 1
	assert.Equal(t, 1.0, kafkaRow[3])   // B result 0
}

func TestFormatScalarResultsAsTableWithTimeSeriesData(t *testing.T) {
	q := &querier{}
	
	// Create time series results that need to be converted to scalar
	results := map[string]*qbtypes.Result{
		"A": {
			Value: &qbtypes.TimeSeriesData{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "count",
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{
										Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
										Value: "frontend",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 100},
									{Timestamp: 2000, Value: 200},
								},
							},
							{
								Labels: []*qbtypes.Label{
									{
										Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
										Value: "backend",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 300},
									{Timestamp: 2000, Value: 400},
								},
							},
						},
					},
				},
			},
		},
		"B": {
			Value: &qbtypes.TimeSeriesData{
				QueryName: "B",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "sum",
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{
										Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
										Value: "frontend",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 10},
									{Timestamp: 2000, Value: 20},
								},
							},
							{
								Labels: []*qbtypes.Label{
									{
										Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
										Value: "backend",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 30},
									{Timestamp: 2000, Value: 40},
								},
							},
						},
					},
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
	
	// Get the table
	table, ok := result["table"].(*qbtypes.ScalarData)
	require.True(t, ok)
	
	// Should have 3 columns: 1 group + 1 from A + 1 from B
	assert.Len(t, table.Columns, 3)
	
	// Check column names
	assert.Equal(t, "service.name", table.Columns[0].Name)
	assert.Equal(t, "count", table.Columns[1].Name) // Should use alias
	assert.Equal(t, "sum", table.Columns[2].Name)   // Should use alias
	
	// Should have 2 rows (frontend and backend)
	assert.Len(t, table.Data, 2)
	
	// Create a map to check row values by service name
	rowMap := make(map[string][]any)
	for _, row := range table.Data {
		serviceName := row[0].(string)
		rowMap[serviceName] = row
	}
	
	// Check frontend row (should have last values)
	frontendRow := rowMap["frontend"]
	assert.Equal(t, "frontend", frontendRow[0])
	assert.Equal(t, 200.0, frontendRow[1]) // Last value from A
	assert.Equal(t, 20.0, frontendRow[2])  // Last value from B
	
	// Check backend row
	backendRow := rowMap["backend"]
	assert.Equal(t, "backend", backendRow[0])
	assert.Equal(t, 400.0, backendRow[1]) // Last value from A
	assert.Equal(t, 40.0, backendRow[2])  // Last value from B
}