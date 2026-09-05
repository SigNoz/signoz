package querybuildertypesv5

import (
	"math"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealignHeatmapValues(t *testing.T) {
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
			description:    "an inserted bucket shifts the counts above it",
			from:           []float64{5, 10},
			onto:           []float64{2, 5, 10},
			values:         []float64{1, 2, 3},
			expectedValues: []float64{0, 1, 2, 3},
		},
		{
			description:    "a dropped bucket loses its counts but the overflow survives",
			from:           []float64{5, 10, 25},
			onto:           []float64{5, 25},
			values:         []float64{1, 2, 3, 4},
			expectedValues: []float64{1, 3, 4},
		},
		{
			description:    "an axis with nothing in common keeps only the overflow",
			from:           []float64{5, 10},
			onto:           []float64{100, 200},
			values:         []float64{1, 2, 3},
			expectedValues: []float64{0, 0, 3},
		},
		{
			description:    "counts beyond the axis they were read against are dropped",
			from:           []float64{5},
			onto:           []float64{5, 10},
			values:         []float64{1, 2, 3},
			expectedValues: []float64{1, 0, 2},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			series := []*TimeSeries{{
				Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: testCase.values}},
			}}

			RealignHeatmapValues(series, testCase.from, testCase.onto)

			require.Len(t, series[0].Values, 1)
			assert.Equal(t, testCase.expectedValues, series[0].Values[0].Values)
		})
	}
}

func TestRealignHeatmapValuesLeavesNonHeatmapPointsAlone(t *testing.T) {
	series := []*TimeSeries{{
		Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Value: 42}},
	}}

	RealignHeatmapValues(series, nil, []float64{5, 10})

	assert.Equal(t, float64(42), series[0].Values[0].Value)
	assert.Empty(t, series[0].Values[0].Values)
}

func TestRealignHeatmapValuesWithoutTargetAxis(t *testing.T) {
	series := []*TimeSeries{{
		Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 2}}},
	}}

	RealignHeatmapValues(series, []float64{5, 10}, nil)

	assert.Equal(t, []float64{1, 2}, series[0].Values[0].Values)
}

func TestDownscaleHeatmapAxis(t *testing.T) {
	testCases := []struct {
		description     string
		fromScale       int
		toScale         int
		buckets         []float64
		values          []float64
		expectedBuckets []float64
		expectedValues  []float64
	}{
		{
			description: "four scale-4 bands merge into one scale-2 band",
			fromScale:   4,
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
			fromScale:       4,
			toScale:         2,
			buckets:         []float64{math.Exp2(-3.0 / 16), math.Exp2(-2.0 / 16), math.Exp2(-1.0 / 16)},
			values:          []float64{1, 2, 3, 4},
			expectedBuckets: []float64{math.Exp2(0)},
			expectedValues:  []float64{6, 4},
		},
		{
			description:     "the zero band keeps its own slot",
			fromScale:       4,
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
			fromScale:       4,
			toScale:         0,
			buckets:         []float64{math.Exp2(1.0 / 16), math.Exp2(8.0 / 16), math.Exp2(16.0 / 16)},
			values:          []float64{1, 2, 3, 4},
			expectedBuckets: []float64{math.Exp2(1)},
			expectedValues:  []float64{6, 4},
		},
		{
			description:     "the finest scale is left alone",
			fromScale:       4,
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

			DownscaleHeatmapAxis(tsData, testCase.fromScale, testCase.toScale)

			aggBucket := tsData.Aggregations[0]
			assert.Equal(t, testCase.expectedBuckets, aggBucket.Meta.Buckets)
			assert.Equal(t, testCase.expectedValues, aggBucket.Series[0].Values[0].Values)
		})
	}
}

func TestDownscaleHeatmapAxisKeepsTheTotalCount(t *testing.T) {
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

	DownscaleHeatmapAxis(tsData, MaxLogScale, 1)

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

func TestDensifyHeatmapAxis(t *testing.T) {
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

			DensifyHeatmapAxis(tsData, testCase.bucketing)

			aggBucket := tsData.Aggregations[0]
			assert.Equal(t, testCase.expectedBuckets, aggBucket.Meta.Buckets)
			assert.Equal(t, testCase.expectedValues, aggBucket.Series[0].Values[0].Values)
		})
	}
}

func TestDensifyHeatmapAxisKeepsTheTotalCount(t *testing.T) {
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

	DensifyHeatmapAxis(tsData, HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale})

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

func TestBucketTimeSeriesValues(t *testing.T) {
	testCases := []struct {
		description     string
		bucketing       HeatmapBucketing
		values          []float64
		expectedBuckets []float64
		expectedValues  [][]float64
	}{
		{
			description: "log values land on the band above them",
			bucketing:   HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale},
			values:      []float64{1, 2, 3},
			expectedBuckets: []float64{
				math.Exp2(0),
				math.Exp2(1),
				math.Exp2(26.0 / 16),
			},
			expectedValues: [][]float64{
				{1, 0, 0, 0},
				{0, 1, 0, 0},
				{0, 0, 1, 0},
			},
		},
		{
			// the log axis has no band below zero, so both report the upper bound
			// that means "everything at or below zero"
			description:     "zero and negative values share the lowest log band",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale},
			values:          []float64{-5, 0, 1},
			expectedBuckets: []float64{0, 1},
			expectedValues: [][]float64{
				{1, 0, 0},
				{1, 0, 0},
				{0, 1, 0},
			},
		},
		{
			description:     "a linear value above maxValue lands in the overflow",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLinear, MaxValue: 100, NumBuckets: 4},
			values:          []float64{30, 100, 150, 0},
			expectedBuckets: []float64{25, 50, 100},
			expectedValues: [][]float64{
				{0, 1, 0, 0},
				{0, 0, 1, 0},
				{0, 0, 0, 1},
				{1, 0, 0, 0},
			},
		},
		{
			description:     "a value with no band occupies no cell",
			bucketing:       HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale},
			values:          []float64{math.NaN(), 1},
			expectedBuckets: []float64{1},
			expectedValues: [][]float64{
				{0, 0},
				{1, 0},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			points := make([]*TimeSeriesValue, 0, len(testCase.values))
			for index, value := range testCase.values {
				points = append(points, &TimeSeriesValue{
					Timestamp: 1710000000000 + int64(index)*60000,
					Value:     value,
				})
			}
			tsData := &TimeSeriesData{
				Aggregations: []*AggregationBucket{{
					Series: []*TimeSeries{{Values: points}},
				}},
			}

			BucketTimeSeriesValues(tsData, testCase.bucketing)

			aggBucket := tsData.Aggregations[0]
			assert.Equal(t, testCase.expectedBuckets, aggBucket.Meta.Buckets)
			for index, point := range aggBucket.Series[0].Values {
				assert.Equal(t, testCase.expectedValues[index], point.Values, "point %d", index)
				assert.Zero(t, point.Value, "point %d keeps its scalar value", index)
			}
		})
	}
}

func TestBucketTimeSeriesValuesSharesOneAxisAcrossSeries(t *testing.T) {
	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Series: []*TimeSeries{
				{
					Labels: []*Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host.name"}, Value: "a"}},
					Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Value: 1}},
				},
				{
					Labels: []*Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host.name"}, Value: "b"}},
					Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Value: 4}},
				},
			},
		}},
	}

	BucketTimeSeriesValues(tsData, HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale})

	aggBucket := tsData.Aggregations[0]
	assert.Equal(t, []float64{math.Exp2(0), math.Exp2(2)}, aggBucket.Meta.Buckets)
	// each series counts itself, and the panel adds up whichever are selected
	assert.Equal(t, []float64{1, 0, 0}, aggBucket.Series[0].Values[0].Values)
	assert.Equal(t, []float64{0, 1, 0}, aggBucket.Series[1].Values[0].Values)
}

func TestBucketTimeSeriesValuesMatchesTheStatementBuilderUpperBounds(t *testing.T) {
	// the same expressions the statement builder renders, evaluated in Go:
	// multiIf(value <= 0, 0, pow(2, ceil(log2(value) * 16) / 16)) and
	// multiIf(value > max, +Inf, least(greatest(ceil(value * n / max), 1), n) * max / n)
	logBucketing := HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale}
	assert.Equal(t, math.Exp2(math.Ceil(math.Log2(37)*16)/16), logBucketing.calculateValueUpperBound(37))
	assert.Equal(t, 0.0, logBucketing.calculateValueUpperBound(-1))

	linearBucketing := HeatmapBucketing{Kind: BucketsKindLinear, MaxValue: 500, NumBuckets: 25}
	assert.Equal(t, math.Ceil(37.0*25/500)*500/25, linearBucketing.calculateValueUpperBound(37))
	assert.Equal(t, 1*500.0/25, linearBucketing.calculateValueUpperBound(0))
	assert.True(t, math.IsInf(linearBucketing.calculateValueUpperBound(501), 1))
}

func TestCalculateValueUpperBoundClampsTheLogAxis(t *testing.T) {
	bucketing := HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale}

	// without the clamp the band index runs off to -inf as a positive value
	// approaches zero, and the axis fill follows it
	assert.Equal(t, MinLogUpperBound, bucketing.calculateValueUpperBound(1e-30))
	assert.Equal(t, MinLogUpperBound, bucketing.calculateValueUpperBound(math.SmallestNonzeroFloat64))
	assert.Equal(t, MinLogUpperBound, bucketing.calculateValueUpperBound(MinLogUpperBound))

	assert.True(t, math.IsInf(bucketing.calculateValueUpperBound(1e30), 1))
	assert.True(t, math.IsInf(bucketing.calculateValueUpperBound(math.MaxFloat64), 1))
	assert.Equal(t, MaxLogUpperBound, bucketing.calculateValueUpperBound(MaxLogUpperBound))

	// zero and negatives keep their own band below the floor
	assert.Equal(t, 0.0, bucketing.calculateValueUpperBound(0))
	assert.Equal(t, 0.0, bucketing.calculateValueUpperBound(-5))

	// anything in between is untouched
	assert.Equal(t, math.Exp2(math.Ceil(math.Log2(37)*16)/16), bucketing.calculateValueUpperBound(37))
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

func TestDensifyHeatmapAxisIsBoundedByTheFloor(t *testing.T) {
	bucketing := HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale}

	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Series: []*TimeSeries{{
				Values: []*TimeSeriesValue{
					{Timestamp: 1710000000000, Value: 1e-30},
					{Timestamp: 1710000060000, Value: 1000},
				},
			}},
		}},
	}

	BucketTimeSeriesValues(tsData, bucketing)
	DensifyHeatmapAxis(tsData, bucketing)

	// 1e-30 clamps to the floor, so the fill spans MinLogBandIndex upwards
	// rather than chasing that value's own index near -1594
	buckets := tsData.Aggregations[0].Meta.Buckets
	highest := bucketing.calculateBandIndex(bucketing.calculateValueUpperBound(1000))
	assert.Equal(t, MinLogUpperBound, buckets[0])
	assert.Len(t, buckets, highest-MinLogBandIndex+1)
}

func TestDensifyHeatmapAxisSkipsANonFiniteUpperBound(t *testing.T) {
	// the overflow is the slot past the axis, never an upper bound on it; a bad one
	// would otherwise size the fill from a garbage band index
	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta:   AggregationMeta{Buckets: []float64{1, math.Inf(1)}},
			Series: []*TimeSeries{{Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 1, 0}}}}},
		}},
	}

	DensifyHeatmapAxis(tsData, HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale})

	assert.Equal(t, []float64{1, math.Inf(1)}, tsData.Aggregations[0].Meta.Buckets)
}

func TestDensifyHeatmapAxisWorstCaseSpan(t *testing.T) {
	bucketing := HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale}

	tsData := &TimeSeriesData{
		Aggregations: []*AggregationBucket{{
			Meta:   AggregationMeta{Buckets: []float64{MinLogUpperBound, MaxLogUpperBound}},
			Series: []*TimeSeries{{Values: []*TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 1, 0}}}}},
		}},
	}

	DensifyHeatmapAxis(tsData, bucketing)

	// the widest axis the bucketing can produce, whatever the data does
	assert.Len(t, tsData.Aggregations[0].Meta.Buckets, MaxLogBandIndex-MinLogBandIndex+1)
}
