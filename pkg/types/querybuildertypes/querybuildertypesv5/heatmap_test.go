package querybuildertypesv5

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToDistributionDataPercentiles(t *testing.T) {
	testCases := []struct {
		name     string
		buckets  []float64
		series   [][][]float64
		expected *DistributionPercentiles
	}{
		{
			name:     "RankInsideBucket_InterpolatesBetweenItsBounds",
			buckets:  []float64{10, 20, 30, 40},
			series:   [][][]float64{{{1, 1, 1, 1, 0}}},
			expected: &DistributionPercentiles{P50: 20, P75: 30, P90: 36, P95: 38, P99: 39.6},
		},
		{
			name:     "SeveralSteps_SummedBeforeRanking",
			buckets:  []float64{10, 20, 30, 40},
			series:   [][][]float64{{{1, 0, 1, 0, 0}, {0, 1, 0, 1, 0}}},
			expected: &DistributionPercentiles{P50: 20, P75: 30, P90: 36, P95: 38, P99: 39.6},
		},
		{
			name:     "SeveralGroups_RankedTogether",
			buckets:  []float64{10, 20, 30, 40},
			series:   [][][]float64{{{1, 1, 0, 0, 0}}, {{0, 0, 1, 1, 0}}},
			expected: &DistributionPercentiles{P50: 20, P75: 30, P90: 36, P95: 38, P99: 39.6},
		},
		{
			name:     "FirstBucket_StartsAtZero",
			buckets:  []float64{0.5, 1},
			series:   [][][]float64{{{2, 2, 0}}},
			expected: &DistributionPercentiles{P50: 0.5, P75: 0.75, P90: 0.9, P95: 0.95, P99: 0.99},
		},
		{
			name:     "ZeroBucket_ReportsItsBound",
			buckets:  []float64{0, 1, 2},
			series:   [][][]float64{{{3, 1, 0, 0}}},
			expected: &DistributionPercentiles{P50: 0, P75: 0, P90: 0.6, P95: 0.8, P99: 0.96},
		},
		{
			name:     "RankInOverflow_ReportsLastUpperBound",
			buckets:  []float64{10, 20},
			series:   [][][]float64{{{0, 1, 5}}},
			expected: &DistributionPercentiles{P50: 20, P75: 20, P90: 20, P95: 20, P99: 20},
		},
		{
			name:    "NoCounts_Omitted",
			buckets: []float64{10, 20},
			series:  [][][]float64{{{0, 0, 0}}},
		},
		{
			name:   "NoBuckets_Omitted",
			series: [][][]float64{{{5}}},
		},
		{
			name:    "NoSeries_Omitted",
			buckets: []float64{10, 20},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			aggBucket := &AggregationBucket{Meta: AggregationMeta{Buckets: testCase.buckets}}
			for _, points := range testCase.series {
				series := &TimeSeries{}
				for i, counts := range points {
					series.Values = append(series.Values, &TimeSeriesValue{Timestamp: int64(i), Values: counts})
				}
				aggBucket.Series = append(aggBucket.Series, series)
			}
			tsData := &TimeSeriesData{QueryName: "A", Aggregations: []*AggregationBucket{aggBucket}}

			data := tsData.ToDistributionData()
			require.Len(t, data.Aggregations, 1)
			assert.Len(t, data.Aggregations[0].Distributions, len(testCase.series))
			percentiles := data.Aggregations[0].Percentiles
			if testCase.expected == nil {
				assert.Nil(t, percentiles)
				return
			}
			require.NotNil(t, percentiles)
			assert.InDelta(t, testCase.expected.P50, percentiles.P50, 1e-9)
			assert.InDelta(t, testCase.expected.P75, percentiles.P75, 1e-9)
			assert.InDelta(t, testCase.expected.P90, percentiles.P90, 1e-9)
			assert.InDelta(t, testCase.expected.P95, percentiles.P95, 1e-9)
			assert.InDelta(t, testCase.expected.P99, percentiles.P99, 1e-9)
		})
	}
}
