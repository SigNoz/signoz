package querier

import (
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestReadAsHeatmap tests the time series consumption with multiple
func TestReadAsHeatmap(t *testing.T) {
	columns := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "__result_0", Type: "Float64"},
		{Name: "bucket", Type: "String"},
	}

	ts := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	// Multiple buckets at the same timestamp
	rowsData := [][]any{
		{ts, 5.0, "0-10"},
		{ts, 3.0, "10-20"},
		{ts, 2.0, "20-30"},
		{ts, 1.0, "30-50"},
	}

	rows := cmock.NewRows(columns, rowsData)

	result, err := consume(rows, qbtypes.RequestTypeHeatmap, nil, qbtypes.Step{}, "test_heatmap_query")
	require.NoError(t, err)
	require.NotNil(t, result)

	timeSeriesData, ok := result.(*qbtypes.TimeSeriesData)
	require.True(t, ok, "expected *qbtypes.TimeSeriesData, got %T", result)

	assert.Equal(t, "test_heatmap_query", timeSeriesData.QueryName)
	require.Len(t, timeSeriesData.Aggregations, 1)

	agg := timeSeriesData.Aggregations[0]
	assert.Equal(t, 0, agg.Index)
	require.Len(t, agg.Series, 4)

	// Validate all series have the same timestamp and correct bucket labels
	expectedBuckets := map[string]float64{
		"0-10":  5.0,
		"10-20": 3.0,
		"20-30": 2.0,
		"30-50": 1.0,
	}

	for _, series := range agg.Series {
		require.Len(t, series.Values, 1, "each bucket should have 1 value")
		assert.Equal(t, ts.UnixMilli(), series.Values[0].Timestamp)

		require.Len(t, series.Labels, 1)
		bucketLabel := series.Labels[0].Value.(string)
		expectedValue, exists := expectedBuckets[bucketLabel]
		require.True(t, exists, "unexpected bucket label: %s", bucketLabel)
		assert.Equal(t, expectedValue, series.Values[0].Value)
	}
}

// TestReadAsTimeSeriesWithMultipleAggregations tests handling of multiple
func TestReadAsTimeSeriesWithMultipleAggregations(t *testing.T) {
	columns := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "__result_0", Type: "Float64"},
		{Name: "__result_1", Type: "Float64"},
		{Name: "service", Type: "String"},
	}

	ts := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	rowsData := [][]any{
		{ts, 100.0, 50.0, "api"},
		{ts, 200.0, 75.0, "db"},
	}

	rows := cmock.NewRows(columns, rowsData)

	result, err := consume(rows, qbtypes.RequestTypeTimeSeries, nil, qbtypes.Step{}, "test_multi_agg")
	require.NoError(t, err)
	require.NotNil(t, result)

	timeSeriesData, ok := result.(*qbtypes.TimeSeriesData)
	require.True(t, ok)

	assert.Equal(t, "test_multi_agg", timeSeriesData.QueryName)
	require.Len(t, timeSeriesData.Aggregations, 2)

	agg0 := timeSeriesData.Aggregations[0]
	assert.Equal(t, 0, agg0.Index)
	assert.Equal(t, "__result_0", agg0.Alias)
	require.Len(t, agg0.Series, 2)

	agg1 := timeSeriesData.Aggregations[1]
	assert.Equal(t, 1, agg1.Index)
	assert.Equal(t, "__result_1", agg1.Alias)
	require.Len(t, agg1.Series, 2)

	for _, series := range agg0.Series {
		switch series.Labels[0].Value {
		case "api":
			assert.Equal(t, 100.0, series.Values[0].Value)
		case "db":
			assert.Equal(t, 200.0, series.Values[0].Value)
		}
	}

	for _, series := range agg1.Series {
		switch series.Labels[0].Value {
		case "api":
			assert.Equal(t, 50.0, series.Values[0].Value)
		case "db":
			assert.Equal(t, 75.0, series.Values[0].Value)
		}
	}
}
