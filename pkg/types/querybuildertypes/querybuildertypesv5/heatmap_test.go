package querybuildertypesv5

import (
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReindexValuesToNewUpperBounds(t *testing.T) {
	testCases := []struct {
		description    string
		from           []float64
		onto           []float64
		values         []float64
		expectedValues []float64
	}{
		{
			description:    "an unchanged axis is left alone",
			from:           []float64{5, 10},
			onto:           []float64{5, 10},
			values:         []float64{1, 2, 3},
			expectedValues: []float64{1, 2, 3},
		},
		{
			description:    "a band no series here reached is inserted below",
			from:           []float64{5, 10},
			onto:           []float64{2, 5, 10},
			values:         []float64{1, 2, 3},
			expectedValues: []float64{0, 1, 2, 3},
		},
		{
			description:    "a band no series here reached is inserted between",
			from:           []float64{2, 10},
			onto:           []float64{2, 5, 10},
			values:         []float64{1, 2, 3},
			expectedValues: []float64{1, 0, 2, 3},
		},
		{
			description:    "the overflow stays the overflow however many bands are inserted",
			from:           []float64{10},
			onto:           []float64{2, 5, 10},
			values:         []float64{1, 2},
			expectedValues: []float64{0, 0, 1, 2},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			aggBucket := &AggregationBucket{
				Meta: AggregationMeta{Buckets: testCase.from},
				Series: []*TimeSeries{{
					Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: testCase.values}},
				}},
			}

			aggBucket.ReindexValuesToNewUpperBounds(testCase.onto)

			require.Len(t, aggBucket.Series[0].Values, 1)
			assert.Equal(t, testCase.expectedValues, aggBucket.Series[0].Values[0].Values)
			assert.Equal(t, testCase.onto, aggBucket.Meta.Buckets)
		})
	}
}

func TestReindexValuesToNewUpperBoundsLeavesNonHeatmapPointsAlone(t *testing.T) {
	aggBucket := &AggregationBucket{
		Series: []*TimeSeries{{
			Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Value: 42}},
		}},
	}

	aggBucket.ReindexValuesToNewUpperBounds([]float64{5, 10})

	assert.Equal(t, float64(42), aggBucket.Series[0].Values[0].Value)
	assert.Empty(t, aggBucket.Series[0].Values[0].Values)
}

func TestReindexValuesToNewUpperBoundsWithoutTargetAxis(t *testing.T) {
	aggBucket := &AggregationBucket{
		Meta: AggregationMeta{Buckets: []float64{5, 10}},
		Series: []*TimeSeries{{
			Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 2}}},
		}},
	}

	aggBucket.ReindexValuesToNewUpperBounds(nil)

	assert.Equal(t, []float64{1, 2}, aggBucket.Series[0].Values[0].Values)
	assert.Equal(t, []float64{5, 10}, aggBucket.Meta.Buckets)
}

func TestDownscaleHeatmapResolution(t *testing.T) {
	testCases := []struct {
		description     string
		toScale         int
		buckets         []float64
		values          []float64
		expectedBuckets []float64
		expectedValues  []float64
	}{
		{
			description: "four scale-4 bands merge into one scale-2 band",
			toScale:     2,
			buckets: []float64{
				math.Exp2(0),
				math.Exp2(1.0 / 16),
				math.Exp2(2.0 / 16),
				math.Exp2(3.0 / 16),
				math.Exp2(4.0 / 16),
			},
			values:          []float64{1, 2, 3, 4, 5, 6},
			expectedBuckets: []float64{math.Exp2(0), math.Exp2(1.0 / 4)},
			expectedValues:  []float64{1, 14, 6},
		},
		{
			description:     "bands below 1 fold onto the same coarse upper bound",
			toScale:         2,
			buckets:         []float64{math.Exp2(-3.0 / 16), math.Exp2(-2.0 / 16), math.Exp2(-1.0 / 16)},
			values:          []float64{1, 2, 3, 4},
			expectedBuckets: []float64{math.Exp2(0)},
			expectedValues:  []float64{6, 4},
		},
		{
			description:     "the zero band keeps its own slot",
			toScale:         2,
			buckets:         []float64{0, math.Exp2(1.0 / 16), math.Exp2(4.0 / 16)},
			values:          []float64{7, 1, 2, 3},
			expectedBuckets: []float64{0, math.Exp2(1.0 / 4)},
			expectedValues:  []float64{7, 3, 3},
		},
		{
			// at scale 0 the whole doubling above 1 is a single band, and 2^(16/16)
			// is its upper bound rather than the start of the next one
			description:     "a doubling's worth of bands collapses into one at scale 0",
			toScale:         0,
			buckets:         []float64{math.Exp2(1.0 / 16), math.Exp2(8.0 / 16), math.Exp2(16.0 / 16)},
			values:          []float64{1, 2, 3, 4},
			expectedBuckets: []float64{math.Exp2(1)},
			expectedValues:  []float64{6, 4},
		},
		{
			description:     "the finest scale is left alone",
			toScale:         4,
			buckets:         []float64{math.Exp2(1.0 / 16), math.Exp2(2.0 / 16)},
			values:          []float64{1, 2, 3},
			expectedBuckets: []float64{math.Exp2(1.0 / 16), math.Exp2(2.0 / 16)},
			expectedValues:  []float64{1, 2, 3},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			tsData := &TimeSeriesData{
				Aggregations: []*AggregationBucket{{
					Meta: AggregationMeta{Buckets: testCase.buckets},
					Series: []*TimeSeries{{
						Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: testCase.values}},
					}},
				}},
			}

			DownscaleHeatmapResolution(tsData, testCase.toScale)

			aggBucket := tsData.Aggregations[0]
			assert.Equal(t, testCase.expectedBuckets, aggBucket.Meta.Buckets)
			assert.Equal(t, testCase.expectedValues, aggBucket.Series[0].Values[0].Values)
		})
	}
}

func TestDownscaleHeatmapResolutionKeepsTheTotalCount(t *testing.T) {
	buckets := make([]float64, 0, 64)
	values := make([]float64, 0, 65)
	for index := range 64 {
		buckets = append(buckets, math.Exp2(float64(index)/16))
		values = append(values, float64(index))
	}
	values = append(values, 100)

	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta: AggregationMeta{Buckets: buckets},
			Series: []*TimeSeries{{
				Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: values}},
			}},
		}},
	}

	var before float64
	for _, count := range values {
		before += count
	}

	DownscaleHeatmapResolution(tsData, 1)

	aggBucket := tsData.Aggregations[0]
	// bands 0..63 fold onto ceil(k/8), so 0..8: the upper bound at 2^0 keeps a band
	// of its own and the four doublings above it take two each
	assert.Len(t, aggBucket.Meta.Buckets, 9)
	assert.Len(t, aggBucket.Series[0].Values[0].Values, 10)

	var after float64
	for _, count := range aggBucket.Series[0].Values[0].Values {
		after += count
	}
	assert.Equal(t, before, after)
}

func TestAddHeatmapBucketsWithNoCounts(t *testing.T) {
	testCases := []struct {
		description     string
		bucketing       HeatmapBucketing
		buckets         []float64
		values          []float64
		expectedBuckets []float64
		expectedValues  []float64
	}{
		{
			description: "an already contiguous log axis is left alone",
			bucketing:   HeatmapBucketing{Kind: BucketsKindLog, LogScale: 4},
			buckets:     []float64{math.Exp2(1.0 / 16), math.Exp2(2.0 / 16), math.Exp2(3.0 / 16)},
			values:      []float64{1, 2, 3, 4},
			expectedBuckets: []float64{
				math.Exp2(1.0 / 16),
				math.Exp2(2.0 / 16),
				math.Exp2(3.0 / 16),
			},
			expectedValues: []float64{1, 2, 3, 4},
		},
		{
			description: "log bands nothing reached are filled in with zero",
			bucketing:   HeatmapBucketing{Kind: BucketsKindLog, LogScale: 4},
			buckets:     []float64{math.Exp2(1.0 / 16), math.Exp2(4.0 / 16)},
			values:      []float64{5, 7, 9},
			expectedBuckets: []float64{
				math.Exp2(1.0 / 16),
				math.Exp2(2.0 / 16),
				math.Exp2(3.0 / 16),
				math.Exp2(4.0 / 16),
			},
			expectedValues: []float64{5, 0, 0, 7, 9},
		},
		{
			description:     "the zero band keeps the lowest slot and the fill starts above it",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLog, LogScale: 4},
			buckets:         []float64{0, math.Exp2(1.0 / 16), math.Exp2(3.0 / 16)},
			values:          []float64{4, 5, 6, 7},
			expectedBuckets: []float64{0, math.Exp2(1.0 / 16), math.Exp2(2.0 / 16), math.Exp2(3.0 / 16)},
			expectedValues:  []float64{4, 5, 0, 6, 7},
		},
		{
			description:     "a log axis spanning a doubling gets every band between",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLog, LogScale: 1},
			buckets:         []float64{math.Exp2(0), math.Exp2(1)},
			values:          []float64{1, 2, 3},
			expectedBuckets: []float64{math.Exp2(0), math.Exp2(0.5), math.Exp2(1)},
			expectedValues:  []float64{1, 0, 2, 3},
		},
		{
			description:     "linear bands nothing reached are filled in with zero",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLinear, MaxValue: 500, NumBuckets: 25},
			buckets:         []float64{20, 100},
			values:          []float64{3, 4, 5},
			expectedBuckets: []float64{20, 40, 60, 80, 100},
			expectedValues:  []float64{3, 0, 0, 0, 4, 5},
		},
		{
			description:     "a single band has nothing to fill in",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLinear, MaxValue: 500, NumBuckets: 25},
			buckets:         []float64{100},
			values:          []float64{1, 2},
			expectedBuckets: []float64{100},
			expectedValues:  []float64{1, 2},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			tsData := &TimeSeriesData{
				Aggregations: []*AggregationBucket{{
					Meta: AggregationMeta{Buckets: testCase.buckets},
					Series: []*TimeSeries{{
						Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: testCase.values}},
					}},
				}},
			}

			AddHeatmapBucketsWithNoCounts(tsData, testCase.bucketing)

			aggBucket := tsData.Aggregations[0]
			assert.Equal(t, testCase.expectedBuckets, aggBucket.Meta.Buckets)
			assert.Equal(t, testCase.expectedValues, aggBucket.Series[0].Values[0].Values)
		})
	}
}

func TestAddHeatmapBucketsWithNoCountsKeepsTheTotalCount(t *testing.T) {
	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta: AggregationMeta{Buckets: []float64{0, math.Exp2(2.0 / 16), math.Exp2(37.0 / 16)}},
			Series: []*TimeSeries{{
				Values: []*TimeSeriesValue{
					{Timestamp: 1710000000000, Values: []float64{2, 3, 5, 7}},
					{Timestamp: 1710000060000, Values: []float64{11, 13, 17, 19}},
				},
			}},
		}},
	}

	AddHeatmapBucketsWithNoCounts(tsData, HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale})

	aggBucket := tsData.Aggregations[0]
	// the zero band plus every band from index 2 to index 37
	assert.Len(t, aggBucket.Meta.Buckets, 37)

	for _, point := range aggBucket.Series[0].Values {
		assert.Len(t, point.Values, 38)
	}
	assert.Equal(t, float64(2+3+5+7), sumHeatmapCounts(aggBucket.Series[0].Values[0].Values))
	assert.Equal(t, float64(11+13+17+19), sumHeatmapCounts(aggBucket.Series[0].Values[1].Values))
}

func sumHeatmapCounts(values []float64) float64 {
	var total float64
	for _, count := range values {
		total += count
	}
	return total
}

func TestLogAxisClampsStayOnTheGridAtEveryScale(t *testing.T) {
	// a coarser fold must land the clamped ends on real upper bounds, which holds
	// because both indexes are powers of two
	for scale := MinLogScale; scale <= MaxLogScale; scale++ {
		bandsPerDoubling := math.Exp2(float64(scale))
		for _, upperBound := range []float64{MinLogUpperBound, MaxLogUpperBound} {
			index := math.Log2(upperBound) * bandsPerDoubling
			assert.Equal(t, math.Trunc(index), index, "scale %d, upperBound %g", scale, upperBound)
		}
	}
}

func TestAddHeatmapBucketsWithNoCountsIsBoundedByTheFloor(t *testing.T) {
	bucketing := HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale}

	// 1e-30 is clamped to MinLogUpperBound before it reaches the axis, rather
	// than keeping its own index near -1594
	bandsPerDoubling := math.Exp2(MaxLogScale)
	upperBoundFor1000 := math.Exp2(math.Ceil(math.Log2(1000)*bandsPerDoubling) / bandsPerDoubling)

	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta: AggregationMeta{Buckets: []float64{MinLogUpperBound, upperBoundFor1000}},
			Series: []*TimeSeries{{
				Values: []*TimeSeriesValue{
					{Timestamp: 1710000000000, Values: []float64{1, 0, 0}},
					{Timestamp: 1710000060000, Values: []float64{0, 1, 0}},
				},
			}},
		}},
	}

	AddHeatmapBucketsWithNoCounts(tsData, bucketing)

	// so the fill spans MinLogBandIndex upwards
	buckets := tsData.Aggregations[0].Meta.Buckets
	highest := bucketing.calculateIndexOfUpperBound(upperBoundFor1000)
	assert.Equal(t, MinLogUpperBound, buckets[0])
	assert.Len(t, buckets, highest-MinLogBandIndex+1)
}

func TestAddHeatmapBucketsWithNoCountsSkipsANonFiniteUpperBound(t *testing.T) {
	// the overflow is the slot past the axis, never an upper bound on it; a bad one
	// would otherwise size the fill from a garbage band index
	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta:   AggregationMeta{Buckets: []float64{1, math.Inf(1)}},
			Series: []*TimeSeries{{Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 1, 0}}}}},
		}},
	}

	AddHeatmapBucketsWithNoCounts(tsData, HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale})

	assert.Equal(t, []float64{1, math.Inf(1)}, tsData.Aggregations[0].Meta.Buckets)
}

func TestAddHeatmapBucketsWithNoCountsWorstCaseSpan(t *testing.T) {
	bucketing := HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale}

	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta:   AggregationMeta{Buckets: []float64{MinLogUpperBound, MaxLogUpperBound}},
			Series: []*TimeSeries{{Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 1, 0}}}}},
		}},
	}

	AddHeatmapBucketsWithNoCounts(tsData, bucketing)

	// the widest axis the bucketing can produce, whatever the data does
	assert.Len(t, tsData.Aggregations[0].Meta.Buckets, MaxLogBandIndex-MinLogBandIndex+1)
}
