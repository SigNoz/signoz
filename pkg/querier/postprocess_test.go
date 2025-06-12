package querier

import (
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestApplyHavingClause(t *testing.T) {
	q := &querier{}

	tests := []struct {
		name     string
		result   *qbtypes.Result
		having   *qbtypes.Having
		expected int // expected number of values after filtering
	}{
		{
			name: "having clause not implemented yet",
			result: &qbtypes.Result{
				Value: &qbtypes.TimeSeriesData{
					QueryName: "test",
					Aggregations: []*qbtypes.AggregationBucket{
						{
							Series: []*qbtypes.TimeSeries{
								{
									Values: []*qbtypes.TimeSeriesValue{
										{Timestamp: 1000, Value: 5},
										{Timestamp: 2000, Value: 15},
										{Timestamp: 3000, Value: 8},
										{Timestamp: 4000, Value: 20},
									},
								},
							},
						},
					},
				},
			},
			having: &qbtypes.Having{
				Expression: "value > 10",
			},
			expected: 4, // No filtering for now
		},
		{
			name: "no having clause",
			result: &qbtypes.Result{
				Value: &qbtypes.TimeSeriesData{
					QueryName: "test",
					Aggregations: []*qbtypes.AggregationBucket{
						{
							Series: []*qbtypes.TimeSeries{
								{
									Values: []*qbtypes.TimeSeriesValue{
										{Timestamp: 1000, Value: 5},
										{Timestamp: 2000, Value: 15},
									},
								},
							},
						},
					},
				},
			},
			having:   nil,
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := q.applyHavingClause(tt.result, tt.having)
			tsData := result.Value.(*qbtypes.TimeSeriesData)

			totalValues := 0
			for _, agg := range tsData.Aggregations {
				for _, series := range agg.Series {
					totalValues += len(series.Values)
				}
			}

			assert.Equal(t, tt.expected, totalValues)
		})
	}
}

func TestApplySeriesLimit(t *testing.T) {
	q := &querier{}

	result := &qbtypes.Result{
		Value: &qbtypes.TimeSeriesData{
			QueryName: "test",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "service1"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10},
								{Timestamp: 2000, Value: 20},
							},
						},
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "service2"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 30},
								{Timestamp: 2000, Value: 40},
							},
						},
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "service3"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 5},
								{Timestamp: 2000, Value: 10},
							},
						},
					},
				},
			},
		},
	}

	// Test limiting to 2 series with default ordering (by value desc)
	limited := q.applySeriesLimit(result, 2, nil)
	tsData := limited.Value.(*qbtypes.TimeSeriesData)

	assert.Len(t, tsData.Aggregations[0].Series, 2)

	// Should keep service2 (avg=35) and service1 (avg=15), drop service3 (avg=7.5)
	assert.Equal(t, "service2", tsData.Aggregations[0].Series[0].Labels[0].Value)
	assert.Equal(t, "service1", tsData.Aggregations[0].Series[1].Labels[0].Value)
}

func TestApplyReduceTo(t *testing.T) {
	q := &querier{}

	tests := []struct {
		name          string
		expression    string
		values        []float64
		expectedValue float64
	}{
		{
			name:          "reduce to last",
			expression:    "last",
			values:        []float64{10, 20, 30},
			expectedValue: 30,
		},
		{
			name:          "reduce to sum",
			expression:    "sum",
			values:        []float64{10, 20, 30},
			expectedValue: 60,
		},
		{
			name:          "reduce to avg",
			expression:    "avg",
			values:        []float64{10, 20, 30},
			expectedValue: 20,
		},
		{
			name:          "reduce to min",
			expression:    "min",
			values:        []float64{10, 20, 5, 30},
			expectedValue: 5,
		},
		{
			name:          "reduce to max",
			expression:    "max",
			values:        []float64{10, 20, 50, 30},
			expectedValue: 50,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create time series values
			var values []*qbtypes.TimeSeriesValue
			for i, v := range tt.values {
				values = append(values, &qbtypes.TimeSeriesValue{
					Timestamp: int64(i * 1000),
					Value:     v,
				})
			}

			result := &qbtypes.Result{
				Value: &qbtypes.TimeSeriesData{
					QueryName: "test",
					Aggregations: []*qbtypes.AggregationBucket{
						{
							Series: []*qbtypes.TimeSeries{
								{
									Values: values,
								},
							},
						},
					},
				},
			}

			secondaryAggs := []qbtypes.SecondaryAggregation{
				{Expression: tt.expression},
			}

			reduced := q.applyReduceTo(result, secondaryAggs)
			tsData := reduced.Value.(*qbtypes.TimeSeriesData)

			require.Len(t, tsData.Aggregations[0].Series[0].Values, 1)
			assert.Equal(t, tt.expectedValue, tsData.Aggregations[0].Series[0].Values[0].Value)
		})
	}
}

func TestFillGaps(t *testing.T) {
	q := &querier{}

	req := &qbtypes.QueryRangeRequest{
		Start:       1000,
		End:         5000,
		RequestType: qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:         "test",
						StepInterval: qbtypes.Step{Duration: time.Second},
					},
				},
			},
		},
		FormatOptions: &qbtypes.FormatOptions{
			FillGaps: true,
		},
	}

	results := map[string]*qbtypes.Result{
		"test": {
			Value: &qbtypes.TimeSeriesData{
				QueryName: "test",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							{
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 10},
									{Timestamp: 3000, Value: 30},
									// Missing 2000, 4000, 5000
								},
							},
						},
					},
				},
			},
		},
	}

	filled := q.fillGaps(results, req)
	tsData := filled["test"].Value.(*qbtypes.TimeSeriesData)
	values := tsData.Aggregations[0].Series[0].Values

	// Should have 5 values: 1000, 2000, 3000, 4000, 5000
	assert.Len(t, values, 5)

	// Check filled values
	assert.Equal(t, int64(1000), values[0].Timestamp)
	assert.Equal(t, 10.0, values[0].Value)

	assert.Equal(t, int64(2000), values[1].Timestamp)
	assert.Equal(t, 0.0, values[1].Value) // Filled with 0

	assert.Equal(t, int64(3000), values[2].Timestamp)
	assert.Equal(t, 30.0, values[2].Value)

	assert.Equal(t, int64(4000), values[3].Timestamp)
	assert.Equal(t, 0.0, values[3].Value) // Filled with 0

	assert.Equal(t, int64(5000), values[4].Timestamp)
	assert.Equal(t, 0.0, values[4].Value) // Filled with 0
}

func TestApplyMetricReduceTo(t *testing.T) {
	q := &querier{}

	tests := []struct {
		name          string
		reduceOp      qbtypes.ReduceTo
		values        []float64
		expectedValue float64
	}{
		{
			name:          "reduce to last",
			reduceOp:      qbtypes.ReduceToLast,
			values:        []float64{10, 20, 30},
			expectedValue: 30,
		},
		{
			name:          "reduce to sum",
			reduceOp:      qbtypes.ReduceToSum,
			values:        []float64{10, 20, 30},
			expectedValue: 60,
		},
		{
			name:          "reduce to avg",
			reduceOp:      qbtypes.ReduceToAvg,
			values:        []float64{10, 20, 30},
			expectedValue: 20,
		},
		{
			name:          "reduce to min",
			reduceOp:      qbtypes.ReduceToMin,
			values:        []float64{10, 20, 5, 30},
			expectedValue: 5,
		},
		{
			name:          "reduce to max",
			reduceOp:      qbtypes.ReduceToMax,
			values:        []float64{10, 20, 50, 30},
			expectedValue: 50,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create time series values
			var values []*qbtypes.TimeSeriesValue
			for i, v := range tt.values {
				values = append(values, &qbtypes.TimeSeriesValue{
					Timestamp: int64(i * 1000),
					Value:     v,
				})
			}

			result := &qbtypes.Result{
				Value: &qbtypes.TimeSeriesData{
					QueryName: "test",
					Aggregations: []*qbtypes.AggregationBucket{
						{
							Series: []*qbtypes.TimeSeries{
								{
									Values: values,
								},
							},
						},
					},
				},
			}

			reduced := q.applyMetricReduceTo(result, tt.reduceOp)
			tsData := reduced.Value.(*qbtypes.TimeSeriesData)

			require.Len(t, tsData.Aggregations[0].Series[0].Values, 1)
			assert.Equal(t, tt.expectedValue, tsData.Aggregations[0].Series[0].Values[0].Value)
		})
	}
}

func TestPostProcessResultsWithMetricReduceTo(t *testing.T) {
	q := &querier{}

	// Test complete PostProcessResults flow with metric ReduceTo
	results := map[string]any{
		"metric_query": &qbtypes.TimeSeriesData{
			QueryName: "metric_query",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 100},
								{Timestamp: 2000, Value: 200},
								{Timestamp: 3000, Value: 150},
							},
						},
					},
				},
			},
		},
	}

	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "metric_query",
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName: "test_metric",
								ReduceTo:   qbtypes.ReduceToAvg, // Should use average (150)
							},
						},
					},
				},
			},
		},
	}

	// Process results
	processed, err := q.PostProcessResults(results, req)
	require.NoError(t, err)

	// Check that the metric was reduced to average
	tsData := processed["metric_query"].(*qbtypes.TimeSeriesData)
	require.Len(t, tsData.Aggregations[0].Series[0].Values, 1)
	assert.Equal(t, 150.0, tsData.Aggregations[0].Series[0].Values[0].Value)
}

func TestPostProcessMetricQuery(t *testing.T) {
	q := &querier{}

	// Test that metric query uses ReduceTo field
	result := &qbtypes.Result{
		Value: &qbtypes.TimeSeriesData{
			QueryName: "test_metric",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10},
								{Timestamp: 2000, Value: 20},
								{Timestamp: 3000, Value: 30},
							},
						},
					},
				},
			},
		},
	}

	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
	}

	query := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Name: "test_metric",
		Aggregations: []qbtypes.MetricAggregation{
			{
				MetricName: "test_metric",
				ReduceTo:   qbtypes.ReduceToMax,
			},
		},
		Functions: []qbtypes.Function{},
		SecondaryAggregations: []qbtypes.SecondaryAggregation{
			{Expression: "sum"}, // This should be ignored when ReduceTo is set
		},
	}

	// Process the metric query
	processed := postProcessMetricQuery(q, result, query, req)
	tsData := processed.Value.(*qbtypes.TimeSeriesData)

	// Should have reduced to max value (30)
	require.Len(t, tsData.Aggregations[0].Series[0].Values, 1)
	assert.Equal(t, 30.0, tsData.Aggregations[0].Series[0].Values[0].Value)
}

func TestFormatScalarResultsAsTable(t *testing.T) {
	q := &querier{}

	// Test simple scalar queries without groupBy (TimeSeriesData to ScalarData conversion)
	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}

	results := map[string]*qbtypes.Result{
		"queryA": {
			Value: &qbtypes.TimeSeriesData{
				QueryName: "queryA",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "count_result",
						Meta: struct {
							Unit string `json:"unit,omitempty"`
						}{
							Unit: "requests",
						},
						Series: []*qbtypes.TimeSeries{
							{
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 100},
									{Timestamp: 2000, Value: 200},
								},
							},
						},
					},
				},
			},
		},
		"queryB": {
			Value: &qbtypes.TimeSeriesData{
				QueryName: "queryB",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "sum_result",
						Meta: struct {
							Unit string `json:"unit,omitempty"`
						}{
							Unit: "bytes",
						},
						Series: []*qbtypes.TimeSeries{
							{
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 50.5678},
								},
							},
						},
					},
				},
			},
		},
	}

	formatted := q.formatScalarResultsAsTable(results, req)

	// Should return table under "table" key when called directly
	table, ok := formatted["table"].(*qbtypes.ScalarData)
	require.True(t, ok)

	// Should have 2 columns
	assert.Len(t, table.Columns, 2)

	// Check column names and metadata
	assert.Equal(t, "count_result", table.Columns[0].Name)
	assert.Equal(t, "requests", table.Columns[0].Meta.Unit)

	assert.Equal(t, "sum_result", table.Columns[1].Name)
	assert.Equal(t, "bytes", table.Columns[1].Meta.Unit)

	// Should have 1 row with 2 values
	assert.Len(t, table.Data, 1)
	assert.Len(t, table.Data[0], 2)

	// Check values (last value from time series, rounded)
	assert.Equal(t, 200.0, table.Data[0][0]) // Last value from queryA
	assert.Equal(t, 50.57, table.Data[0][1]) // Rounded value from queryB
}

func TestFormatScalarResultsAsTableWithScalarData(t *testing.T) {
	q := &querier{}

	// Test with ScalarData (already formatted from query execution)
	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}

	results := map[string]*qbtypes.Result{
		"queryA": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
						QueryName: "queryA",
						Type:      qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "count",
						},
						QueryName:        "queryA",
						AggregationIndex: 0,
						Type:             qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"service1", 100.0},
					{"service2", 200.0},
				},
			},
		},
		"queryB": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
						QueryName: "queryB",
						Type:      qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "sum",
						},
						QueryName:        "queryB",
						AggregationIndex: 0,
						Type:             qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"service1", 50.0},
					{"service2", 75.0},
				},
			},
		},
	}

	formatted := q.formatScalarResultsAsTable(results, req)

	// Should return a merged table with all results
	table, ok := formatted["table"].(*qbtypes.ScalarData)
	require.True(t, ok)

	// Should have 3 columns: service.name (group), count (from queryA), sum (from queryB)
	assert.Len(t, table.Columns, 3)
	assert.Equal(t, "service.name", table.Columns[0].Name)
	assert.Equal(t, qbtypes.ColumnTypeGroup, table.Columns[0].Type)
	// Aggregation columns
	assert.Equal(t, qbtypes.ColumnTypeAggregation, table.Columns[1].Type)
	assert.Equal(t, "queryA", table.Columns[1].QueryName)
	assert.Equal(t, qbtypes.ColumnTypeAggregation, table.Columns[2].Type) 
	assert.Equal(t, "queryB", table.Columns[2].QueryName)

	// Should have 2 rows
	assert.Len(t, table.Data, 2)
	// Check row values - sorted by first aggregation column (descending)
	// service2 has value 200, service1 has value 100, so service2 comes first
	assert.Equal(t, "service2", table.Data[0][0])
	assert.Equal(t, 200.0, table.Data[0][1])
	assert.Equal(t, 75.0, table.Data[0][2])
	assert.Equal(t, "service1", table.Data[1][0])
	assert.Equal(t, 100.0, table.Data[1][1])
	assert.Equal(t, 50.0, table.Data[1][2])
}

func TestFormatScalarResultsAsTableMergesDuplicateRows(t *testing.T) {
	q := &querier{}

	// Test that duplicate rows are properly merged
	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}

	results := map[string]*qbtypes.Result{
		"A": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
						QueryName: "A",
						Type:      qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "count",
						},
						QueryName:        "A",
						AggregationIndex: 0,
						Type:             qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"service1", 100.0},
					{"service2", 200.0},
					{"service3", 300.0},
				},
			},
		},
		"B": {
			Value: &qbtypes.ScalarData{
				Columns: []*qbtypes.ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
						QueryName: "B",
						Type:      qbtypes.ColumnTypeGroup,
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "sum",
						},
						QueryName:        "B",
						AggregationIndex: 0,
						Type:             qbtypes.ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"service1", 150.0},
					{"service2", 250.0},
					{"service3", 350.0},
				},
			},
		},
	}

	formatted := q.formatScalarResultsAsTable(results, req)

	// Should return a merged table
	table, ok := formatted["table"].(*qbtypes.ScalarData)
	require.True(t, ok)

	// Should have 3 columns: service.name, count (from A), sum (from B)
	assert.Len(t, table.Columns, 3)

	// Should have 3 rows (not 6) - one per service
	assert.Len(t, table.Data, 3)

	// Check that rows are properly merged (sorted by first aggregation column desc)
	assert.Equal(t, "service3", table.Data[0][0]) // Highest count value
	assert.Equal(t, 300.0, table.Data[0][1])      // count from A
	assert.Equal(t, 350.0, table.Data[0][2])      // sum from B

	assert.Equal(t, "service2", table.Data[1][0])
	assert.Equal(t, 200.0, table.Data[1][1])
	assert.Equal(t, 250.0, table.Data[1][2])

	assert.Equal(t, "service1", table.Data[2][0]) // Lowest count value
	assert.Equal(t, 100.0, table.Data[2][1])
	assert.Equal(t, 150.0, table.Data[2][2])
}

func TestFormatScalarResultsAsTableWithEmptyResults(t *testing.T) {
	q := &querier{}

	// Test with empty results (queries executed but returned no data)
	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Name: "A",
					},
				},
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Name: "B",
					},
				},
			},
		},
	}

	results := map[string]*qbtypes.Result{
		"A": {
			Value: &qbtypes.TimeSeriesData{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "logs_count",
						Series: []*qbtypes.TimeSeries{}, // Empty series
					},
					{
						Index: 1,
						Alias: "unique hosts",
						Series: []*qbtypes.TimeSeries{}, // Empty series
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
						Alias: "hosts",
						Series: []*qbtypes.TimeSeries{}, // Empty series
					},
				},
			},
		},
	}

	formatted := q.formatScalarResultsAsTable(results, req)

	// Should return a table structure even with empty results
	table, ok := formatted["table"].(*qbtypes.ScalarData)
	require.True(t, ok)
	
	// Should have columns for the aggregations even with no data
	// Columns: logs_count, unique hosts (from A), hosts (from B)
	assert.Len(t, table.Columns, 3)
	
	// Should have no data rows
	assert.Len(t, table.Data, 0)
	
	// But should have columns for the empty aggregations
	assert.True(t, len(table.Columns) > 0)
}
