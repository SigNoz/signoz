package querier

import (
	"log/slog"
	"os"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMergeDistributionResults_EmptyResults(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	result := q.mergeDistributionResults([]*qbtypes.Result{})

	assert.NotNil(t, result)
	assert.Empty(t, result.Aggregations)
	assert.Empty(t, result.QueryName)
}

func TestMergeDistributionResults_SingleResult(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	freshResults := []*qbtypes.Result{
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 5},
							{LowerBound: 100, UpperBound: 200, Count: 10},
							{LowerBound: 200, UpperBound: 300, Count: 3},
						},
					},
				},
			},
		},
	}

	result := q.mergeDistributionResults(freshResults)

	require.NotNil(t, result)
	assert.Equal(t, "A", result.QueryName)
	assert.Len(t, result.Aggregations, 1)
	assert.Equal(t, 0, result.Aggregations[0].Index)
	assert.Equal(t, "duration", result.Aggregations[0].Alias)
	assert.Len(t, result.Aggregations[0].Buckets, 3)

	// Verify buckets are sorted by lower bound
	buckets := result.Aggregations[0].Buckets
	assert.Equal(t, float64(0), buckets[0].LowerBound)
	assert.Equal(t, float64(100), buckets[1].LowerBound)
	assert.Equal(t, float64(200), buckets[2].LowerBound)
}

func TestMergeDistributionResults_MultipleResultsSameBuckets(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	// Simulating results from parallel queries over different time ranges
	// with the same bucket boundaries
	freshResults := []*qbtypes.Result{
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 5},
							{LowerBound: 100, UpperBound: 200, Count: 10},
							{LowerBound: 200, UpperBound: 300, Count: 3},
						},
					},
				},
			},
		},
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 7},
							{LowerBound: 100, UpperBound: 200, Count: 15},
							{LowerBound: 200, UpperBound: 300, Count: 2},
						},
					},
				},
			},
		},
	}

	result := q.mergeDistributionResults(freshResults)

	require.NotNil(t, result)
	assert.Equal(t, "A", result.QueryName)
	assert.Len(t, result.Aggregations, 1)
	assert.Len(t, result.Aggregations[0].Buckets, 3)

	// Verify counts are summed
	buckets := result.Aggregations[0].Buckets
	assert.Equal(t, float64(0), buckets[0].LowerBound)
	assert.Equal(t, float64(100), buckets[0].UpperBound)
	assert.Equal(t, float64(12), buckets[0].Count) // 5 + 7

	assert.Equal(t, float64(100), buckets[1].LowerBound)
	assert.Equal(t, float64(200), buckets[1].UpperBound)
	assert.Equal(t, float64(25), buckets[1].Count) // 10 + 15

	assert.Equal(t, float64(200), buckets[2].LowerBound)
	assert.Equal(t, float64(300), buckets[2].UpperBound)
	assert.Equal(t, float64(5), buckets[2].Count) // 3 + 2
}

func TestMergeDistributionResults_MultipleResultsDifferentBuckets(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	// Results with some overlapping and some unique buckets
	freshResults := []*qbtypes.Result{
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 5},
							{LowerBound: 100, UpperBound: 200, Count: 10},
						},
					},
				},
			},
		},
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 100, UpperBound: 200, Count: 15}, // Overlapping
							{LowerBound: 200, UpperBound: 300, Count: 8},  // New bucket
						},
					},
				},
			},
		},
	}

	result := q.mergeDistributionResults(freshResults)

	require.NotNil(t, result)
	assert.Len(t, result.Aggregations, 1)
	assert.Len(t, result.Aggregations[0].Buckets, 3)

	// Verify all buckets are present and sorted
	buckets := result.Aggregations[0].Buckets
	assert.Equal(t, float64(0), buckets[0].LowerBound)
	assert.Equal(t, float64(5), buckets[0].Count)

	assert.Equal(t, float64(100), buckets[1].LowerBound)
	assert.Equal(t, float64(25), buckets[1].Count) // 10 + 15

	assert.Equal(t, float64(200), buckets[2].LowerBound)
	assert.Equal(t, float64(8), buckets[2].Count)
}

func TestMergeDistributionResults_MultipleAggregations(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	freshResults := []*qbtypes.Result{
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 5},
						},
					},
					{
						Index: 1,
						Alias: "size",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 1000, Count: 20},
						},
					},
				},
			},
		},
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 3},
						},
					},
					{
						Index: 1,
						Alias: "size",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 1000, Count: 15},
						},
					},
				},
			},
		},
	}

	result := q.mergeDistributionResults(freshResults)

	require.NotNil(t, result)
	assert.Len(t, result.Aggregations, 2)

	// Verify aggregations are sorted by index
	assert.Equal(t, 0, result.Aggregations[0].Index)
	assert.Equal(t, "duration", result.Aggregations[0].Alias)
	assert.Equal(t, float64(8), result.Aggregations[0].Buckets[0].Count) // 5 + 3

	assert.Equal(t, 1, result.Aggregations[1].Index)
	assert.Equal(t, "size", result.Aggregations[1].Alias)
	assert.Equal(t, float64(35), result.Aggregations[1].Buckets[0].Count) // 20 + 15
}

func TestMergeDistributionResults_NilAndEmptyResults(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	freshResults := []*qbtypes.Result{
		{
			Type:  qbtypes.RequestTypeDistribution,
			Value: nil, // Nil value
		},
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName:    "A",
				Aggregations: nil, // Nil aggregations
			},
		},
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "A",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 5},
						},
					},
				},
			},
		},
	}

	result := q.mergeDistributionResults(freshResults)

	require.NotNil(t, result)
	assert.Len(t, result.Aggregations, 1)
	assert.Equal(t, float64(5), result.Aggregations[0].Buckets[0].Count)
}

func TestMergeDistributionResults_WrongType(t *testing.T) {
	q := &querier{
		logger: slog.New(slog.NewTextHandler(os.Stdout, nil)),
	}

	freshResults := []*qbtypes.Result{
		{
			Type: qbtypes.RequestTypeTimeSeries,
			Value: &qbtypes.TimeSeriesData{ // Wrong type
				QueryName: "A",
			},
		},
		{
			Type: qbtypes.RequestTypeDistribution,
			Value: &qbtypes.DistributionData{
				QueryName: "B",
				Aggregations: []*qbtypes.DistributionAggregation{
					{
						Index: 0,
						Alias: "duration",
						Buckets: []*qbtypes.DistributionBucket{
							{LowerBound: 0, UpperBound: 100, Count: 5},
						},
					},
				},
			},
		},
	}

	result := q.mergeDistributionResults(freshResults)

	require.NotNil(t, result)
	assert.Len(t, result.Aggregations, 1)
}

func TestDistributionBucketKey(t *testing.T) {
	tests := []struct {
		name       string
		lowerBound float64
		upperBound float64
		expected   string
	}{
		{
			name:       "integer bounds",
			lowerBound: 0,
			upperBound: 100,
			expected:   "0-100",
		},
		{
			name:       "decimal bounds",
			lowerBound: 0.5,
			upperBound: 1.5,
			expected:   "0.5-1.5",
		},
		{
			name:       "negative bounds",
			lowerBound: -10.5,
			upperBound: -5.2,
			expected:   "-10.5--5.2",
		},
		{
			name:       "large numbers",
			lowerBound: 1000000,
			upperBound: 2000000,
			expected:   "1000000-2000000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := distributionBucketKey(tt.lowerBound, tt.upperBound)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestDistributionBucketKey_Uniqueness(t *testing.T) {
	// Verify that different bucket bounds produce different keys
	key1 := distributionBucketKey(0, 100)
	key2 := distributionBucketKey(100, 200)
	key3 := distributionBucketKey(0, 200)

	assert.NotEqual(t, key1, key2)
	assert.NotEqual(t, key1, key3)
	assert.NotEqual(t, key2, key3)

	// Verify that same bounds produce same key
	key4 := distributionBucketKey(0, 100)
	assert.Equal(t, key1, key4)
}
