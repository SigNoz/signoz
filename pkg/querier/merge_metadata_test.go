package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMergeTimeSeriesResults_PreservesMetadata(t *testing.T) {
	q := &querier{}

	// Create cached data with metadata
	cachedValue := &qbtypes.TimeSeriesData{
		QueryName: "testQuery",
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
						Labels: []*qbtypes.Label{
							{
								Key:   telemetrytypes.TelemetryFieldKey{Name: "service"},
								Value: "frontend",
							},
						},
						Values: []*qbtypes.TimeSeriesValue{
							{Timestamp: 1000, Value: 10},
							{Timestamp: 2000, Value: 20},
						},
					},
				},
			},
			{
				Index: 1,
				Alias: "sum_result",
				Meta: struct {
					Unit string `json:"unit,omitempty"`
				}{
					Unit: "bytes",
				},
				Series: []*qbtypes.TimeSeries{
					{
						Labels: []*qbtypes.Label{
							{
								Key:   telemetrytypes.TelemetryFieldKey{Name: "service"},
								Value: "backend",
							},
						},
						Values: []*qbtypes.TimeSeriesValue{
							{Timestamp: 1000, Value: 100},
						},
					},
				},
			},
		},
	}

	// Create fresh results with some overlapping and new data
	freshResults := []*qbtypes.Result{
		{
			Value: &qbtypes.TimeSeriesData{
				QueryName: "testQuery",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "count_result", // Same alias
						Meta: struct {
							Unit string `json:"unit,omitempty"`
						}{
							Unit: "requests", // Same unit
						},
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{
										Key:   telemetrytypes.TelemetryFieldKey{Name: "service"},
										Value: "frontend",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 3000, Value: 30},
									{Timestamp: 4000, Value: 40},
								},
							},
						},
					},
					{
						Index: 2, // New aggregation
						Alias: "avg_result",
						Meta: struct {
							Unit string `json:"unit,omitempty"`
						}{
							Unit: "milliseconds",
						},
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{
										Key:   telemetrytypes.TelemetryFieldKey{Name: "service"},
										Value: "api",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 50},
								},
							},
						},
					},
				},
			},
		},
	}

	// Merge the results
	result := q.mergeTimeSeriesResults(cachedValue, freshResults)

	// Verify the result
	require.NotNil(t, result)
	assert.Equal(t, "testQuery", result.QueryName)
	assert.Len(t, result.Aggregations, 3) // Should have 3 aggregations

	// Check each aggregation
	for _, agg := range result.Aggregations {
		switch agg.Index {
		case 0:
			assert.Equal(t, "count_result", agg.Alias)
			assert.Equal(t, "requests", agg.Meta.Unit)
			assert.Len(t, agg.Series, 1)
			// Should have merged values
			assert.Len(t, agg.Series[0].Values, 4)
		case 1:
			assert.Equal(t, "sum_result", agg.Alias)
			assert.Equal(t, "bytes", agg.Meta.Unit)
			assert.Len(t, agg.Series, 1)
			assert.Len(t, agg.Series[0].Values, 1)
		case 2:
			assert.Equal(t, "avg_result", agg.Alias)
			assert.Equal(t, "milliseconds", agg.Meta.Unit)
			assert.Len(t, agg.Series, 1)
			assert.Len(t, agg.Series[0].Values, 1)
		default:
			t.Fatalf("Unexpected aggregation index: %d", agg.Index)
		}
	}
}

func TestMergeTimeSeriesResults_HandlesEmptyMetadata(t *testing.T) {
	q := &querier{}

	// Create cached data without metadata
	cachedValue := &qbtypes.TimeSeriesData{
		QueryName: "testQuery",
		Aggregations: []*qbtypes.AggregationBucket{
			{
				Index: 0,
				Series: []*qbtypes.TimeSeries{
					{
						Labels: []*qbtypes.Label{
							{
								Key:   telemetrytypes.TelemetryFieldKey{Name: "service"},
								Value: "frontend",
							},
						},
						Values: []*qbtypes.TimeSeriesValue{
							{Timestamp: 1000, Value: 10},
						},
					},
				},
			},
		},
	}

	// Create fresh results with metadata
	freshResults := []*qbtypes.Result{
		{
			Value: &qbtypes.TimeSeriesData{
				QueryName: "testQuery",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Index: 0,
						Alias: "new_alias",
						Meta: struct {
							Unit string `json:"unit,omitempty"`
						}{
							Unit: "items",
						},
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{
										Key:   telemetrytypes.TelemetryFieldKey{Name: "service"},
										Value: "frontend",
									},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 2000, Value: 20},
								},
							},
						},
					},
				},
			},
		},
	}

	// Merge the results
	result := q.mergeTimeSeriesResults(cachedValue, freshResults)

	// Verify the metadata from fresh results is preserved
	require.NotNil(t, result)
	assert.Len(t, result.Aggregations, 1)
	assert.Equal(t, "new_alias", result.Aggregations[0].Alias)
	assert.Equal(t, "items", result.Aggregations[0].Meta.Unit)
}
