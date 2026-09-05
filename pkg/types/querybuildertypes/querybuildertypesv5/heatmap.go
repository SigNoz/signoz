package querybuildertypesv5

import (
	"maps"
	"math"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

const (
	// HeatmapBucketColumn is the alias a heatmap statement gives the column holding
	// a row's bucket upper bound. Every other aggregation returns a single numeric
	// column the reader treats as the value; this name tells the two apart.
	HeatmapBucketColumn = "__bucket"

	DefaultNumBuckets = 60

	// MaxLogScale is the resolution ClickHouse buckets every log heatmap at:
	// 2^MaxLogScale bands per doubling. It is both the default and the finest
	// available, since a coarser LogBucketsSpec.Scale folds down from it.
	MaxLogScale = 4
	// MinLogScale is one band per 16x, the coarsest axis worth rendering.
	MinLogScale = -4

	// A positive value approaching zero runs its band index off to -inf, so
	// without a clamp one near-zero sample would stretch the axis by thousands
	// of bands once AddHeatmapBucketsWithNoCounts spans it.
	MinLogBandIndex = -512 // 2^-32, about 2.3e-10
	MaxLogBandIndex = 1024 // 2^64, about 1.8e19
)

// MinLogUpperBound and MaxLogUpperBound are the ends the log axis is clamped
// to. They do not vary with the requested scale.
var (
	MinLogUpperBound = math.Exp2(float64(MinLogBandIndex) / math.Exp2(MaxLogScale))
	MaxLogUpperBound = math.Exp2(float64(MaxLogBandIndex) / math.Exp2(MaxLogScale))
)

// HeatmapBucketing is the bucket axis a heatmap statement builds in ClickHouse,
// resolved from BucketOptions once the metric type is known. It stays nil for
// histograms, whose upper bounds come from their own `le` labels.
type HeatmapBucketing struct {
	Kind BucketsKind
	// LogScale is the resolution the caller asked for. ClickHouse always buckets
	// at MaxLogScale, and postprocessing folds the axis down to this.
	LogScale int
	// MaxValue and NumBuckets are linear only.
	MaxValue   float64
	NumBuckets int
}

// ToHeatmapBucketing fills in what the caller left unset. An absent
// BucketOptions resolves to the finest log axis, the one kind that needs nothing
// from the caller.
func (b *BucketOptions) ToHeatmapBucketing() HeatmapBucketing {
	resolved := HeatmapBucketing{
		Kind:       BucketsKindLog,
		LogScale:   MaxLogScale,
		NumBuckets: DefaultNumBuckets,
	}
	if b == nil {
		return resolved
	}

	switch spec := b.Spec.(type) {
	case LinearBucketsSpec:
		resolved.Kind = BucketsKindLinear
		resolved.MaxValue = spec.MaxValue
		if spec.NumBuckets > 0 {
			resolved.NumBuckets = spec.NumBuckets
		}
	case LogBucketsSpec:
		if spec.Scale != nil {
			resolved.LogScale = *spec.Scale
		}
	}

	return resolved
}

// This cannot be called in validateHeatmap cuz type is resolved in querier.go.
func (a *MetricAggregation) VerifyAndApplyBucketOptions(bucketOptions *BucketOptions) error {
	switch a.Type {
	case metrictypes.HistogramType:
		if bucketOptions != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"bucketOptions are not supported for histogram metrics: %q takes its bucket axis from its own `le` labels, so nothing in the spec would be applied", a.MetricName)
		}
		a.HeatmapBucketing = nil
		return nil
	// A summary carries no upper bounds of its own either, and its samples reach
	// the final select the same way a gauge's do, so it buckets identically.
	case metrictypes.GaugeType, metrictypes.SumType, metrictypes.SummaryType:
		bucketing := bucketOptions.ToHeatmapBucketing()
		a.HeatmapBucketing = &bucketing
		return nil
	case metrictypes.UnspecifiedType:
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"heatmaps need a metric whose type is known: no type is recorded for %q, so its bucket axis cannot be chosen", a.MetricName)
	case metrictypes.ExpHistogramType:
		return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported,
			"heatmaps are not supported for exponential histograms yet: %q keeps its bucket counts in a sketch column, which needs its own reader", a.MetricName)
	default:
		return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported,
			"heatmaps are not supported for %s metrics", a.Type.StringValue())
	}
}

func MergeBucketUpperBounds(tsData ...*TimeSeriesData) map[int][]float64 {
	upperBoundsByAggregation := map[int][]float64{}

	for _, data := range tsData {
		if data == nil {
			continue
		}
		for _, aggBucket := range data.Aggregations {
			if len(aggBucket.Meta.Buckets) == 0 {
				continue
			}
			upperBoundsByAggregation[aggBucket.Index] = append(upperBoundsByAggregation[aggBucket.Index], aggBucket.Meta.Buckets...)
		}
	}

	for index, upperBounds := range upperBoundsByAggregation {
		slices.Sort(upperBounds)
		upperBoundsByAggregation[index] = slices.Compact(upperBounds)
	}

	return upperBoundsByAggregation
}

// DownscaleHeatmapResolution folds the MaxLogScale axis ClickHouse buckets at
// down to toScale, merging every 2^(MaxLogScale-toScale) adjacent bands into
// one. The coarser upper bounds are a subset of the finer ones, so the fold is
// exact.
func DownscaleHeatmapResolution(tsData *TimeSeriesData, toScale int) {
	if tsData == nil || toScale >= MaxLogScale {
		return
	}
	for _, aggBucket := range tsData.Aggregations {
		downscaleHeatmapResolutionForAggregation(aggBucket, toScale)
	}
}

func downscaleHeatmapResolutionForAggregation(aggBucket *AggregationBucket, toScale int) {
	if aggBucket == nil || len(aggBucket.Meta.Buckets) == 0 {
		return
	}

	factor := int(math.Exp2(float64(MaxLogScale - toScale)))

	// Merging is by index in the exponential mapping, not by position in
	// Meta.Buckets, which lists only the upper bounds some series reached.
	coarseUpperBounds := make([]float64, 0, len(aggBucket.Meta.Buckets))
	upperBoundToCoarseIndex := make(map[float64]int, len(aggBucket.Meta.Buckets))
	mergedInto := make([]int, len(aggBucket.Meta.Buckets))
	for index, upperBound := range aggBucket.Meta.Buckets {
		coarsened := coarsenUpperBound(upperBound, toScale, factor)
		coarseIndex, ok := upperBoundToCoarseIndex[coarsened]
		if !ok {
			coarseIndex = len(coarseUpperBounds)
			coarseUpperBounds = append(coarseUpperBounds, coarsened)
			upperBoundToCoarseIndex[coarsened] = coarseIndex
		}
		mergedInto[index] = coarseIndex
	}

	overflowIndex := len(coarseUpperBounds)
	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			if len(point.Values) == 0 {
				continue
			}
			coarseCounts := make([]float64, overflowIndex+1)
			for index, count := range point.Values {
				if index >= len(mergedInto) {
					coarseCounts[overflowIndex] += count
					continue
				}
				coarseCounts[mergedInto[index]] += count
			}
			point.Values = coarseCounts
		}
	}
	aggBucket.Meta.Buckets = coarseUpperBounds
}

// coarsenUpperBound moves an upper bound from the MaxLogScale exponential axis
// onto the toScale one. The zero band has no exponent to rescale and stays put.
func coarsenUpperBound(upperBound float64, toScale, factor int) float64 {
	if upperBound <= 0 || math.IsInf(upperBound, 0) || math.IsNaN(upperBound) {
		return upperBound
	}
	index := int(math.Round(math.Log2(upperBound) * math.Exp2(MaxLogScale)))
	merged := int(math.Ceil(float64(index) / float64(factor)))
	return math.Exp2(float64(merged) / math.Exp2(float64(toScale)))
}

// AddHeatmapBucketsWithNoCounts spans the range from the lowest upper bound some
// series reached to the highest. Meta.Buckets leaves the ones in between out
// entirely, so without this a gap renders with its two sides touching.
//
// Only a value-derived axis can be spanned: its upper bounds come from an index
// that is a pure function of the value, so the ones in between are known without
// having seen them. Nothing says what sits between two `le` labels.
func AddHeatmapBucketsWithNoCounts(tsData *TimeSeriesData, bucketing HeatmapBucketing) {
	if tsData == nil {
		return
	}
	for _, aggBucket := range tsData.Aggregations {
		addHeatmapBucketsWithNoCountsForAggregation(aggBucket, bucketing)
	}
}

func addHeatmapBucketsWithNoCountsForAggregation(aggBucket *AggregationBucket, bucketing HeatmapBucketing) {
	if aggBucket == nil || len(aggBucket.Meta.Buckets) == 0 {
		return
	}

	// The zero bucket holds everything at or below zero. It has no index on either
	// axis and sits below every other upper bound, so it keeps index 0 and the
	// fill runs over the rest.
	offset := 0
	if aggBucket.Meta.Buckets[0] <= 0 {
		offset = 1
	}
	positive := aggBucket.Meta.Buckets[offset:]
	if len(positive) == 0 {
		return
	}

	// Only finite upper bounds have an index, and the fill sizes a slice from
	// one. Nothing should put +Inf or NaN on the axis, but bail if it happens.
	indexes := make([]int, len(positive))
	for i, upperBound := range positive {
		if math.IsInf(upperBound, 0) || math.IsNaN(upperBound) {
			return
		}
		indexes[i] = bucketing.calculateBandIndex(upperBound)
	}
	lowest, highest := slices.Min(indexes), slices.Max(indexes)

	denseUpperBounds := append([]float64{}, aggBucket.Meta.Buckets[:offset]...)
	for index := lowest; index <= highest; index++ {
		denseUpperBounds = append(denseUpperBounds, bucketing.calculateBandUpperBound(index))
	}
	if len(denseUpperBounds) == len(aggBucket.Meta.Buckets) {
		return
	}

	// Counts map through their index rather than by matching upper bounds, so a
	// regenerated upper bound differing from ClickHouse's in its last bit still
	// lands where it came from.
	shiftedTo := make([]int, len(aggBucket.Meta.Buckets))
	for i, index := range indexes {
		shiftedTo[i+offset] = index - lowest + offset
	}

	overflowIndex := len(denseUpperBounds)
	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			if len(point.Values) == 0 {
				continue
			}
			denseCounts := make([]float64, overflowIndex+1)
			for index, count := range point.Values {
				if index >= len(shiftedTo) {
					denseCounts[overflowIndex] += count
					continue
				}
				denseCounts[shiftedTo[index]] += count
			}
			point.Values = denseCounts
		}
	}
	aggBucket.Meta.Buckets = denseUpperBounds
}

// calculateBandIndex and calculateBandUpperBound are inverses over the axis being
// returned, so they read h.LogScale where calculateValueUpperBound reads
// MaxLogScale: k * maxValue / numBuckets on a linear axis, 2^(k / 2^scale) on a
// log one.
func (h HeatmapBucketing) calculateBandIndex(upperBound float64) int {
	if h.Kind == BucketsKindLinear {
		return int(math.Round(upperBound * float64(h.NumBuckets) / h.MaxValue))
	}
	return int(math.Round(math.Log2(upperBound) * math.Exp2(float64(h.LogScale))))
}

func (h HeatmapBucketing) calculateBandUpperBound(index int) float64 {
	if h.Kind == BucketsKindLinear {
		return float64(index) * h.MaxValue / float64(h.NumBuckets)
	}
	return math.Exp2(float64(index) / math.Exp2(float64(h.LogScale)))
}

// BucketTimeSeriesValues turns one value per (series, timestamp) into heatmap
// cells on the axis bucketing describes, which is what ClickHouse does for a
// gauge or sum. A formula has no statement to carry the upper bound expression, so
// its output is bucketed here instead. Every value counts the one series it came
// from, so a point ends up with a single occupied cell.
func BucketTimeSeriesValues(tsData *TimeSeriesData, bucketing HeatmapBucketing) {
	if tsData == nil {
		return
	}
	for _, aggBucket := range tsData.Aggregations {
		bucketAggregationValues(aggBucket, bucketing)
	}
}

func bucketAggregationValues(aggBucket *AggregationBucket, bucketing HeatmapBucketing) {
	if aggBucket == nil {
		return
	}

	// +Inf is the open-above overflow rather than an upper bound of its own, and a
	// NaN value has no band at all
	upperBoundSet := map[float64]struct{}{}
	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			upperBound := bucketing.calculateValueUpperBound(point.Value)
			if !math.IsNaN(upperBound) && !math.IsInf(upperBound, 0) {
				upperBoundSet[upperBound] = struct{}{}
			}
		}
	}
	upperBounds := slices.Sorted(maps.Keys(upperBoundSet))

	upperBoundToIndex := make(map[float64]int, len(upperBounds))
	for index, upperBound := range upperBounds {
		upperBoundToIndex[upperBound] = index
	}

	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			upperBound := bucketing.calculateValueUpperBound(point.Value)
			point.Values = make([]float64, len(upperBounds)+1)
			point.Value = 0
			switch {
			case math.IsNaN(upperBound):
			case math.IsInf(upperBound, 1):
				point.Values[len(upperBounds)] = 1
			default:
				point.Values[upperBoundToIndex[upperBound]] = 1
			}
		}
	}

	aggBucket.Meta.Buckets = upperBounds
}

// calculateValueUpperBound renders the upper bound of the band value falls in. It
// is the Go side of the expression the statement builder emits and has to stay
// identical to it: a formula heatmap and a metric heatmap that disagreed here
// would put their bands in different places.
func (h HeatmapBucketing) calculateValueUpperBound(value float64) float64 {
	if h.Kind == BucketsKindLinear {
		if value > h.MaxValue {
			return math.Inf(1)
		}
		numBuckets := float64(h.NumBuckets)
		index := math.Min(math.Max(math.Ceil(value*numBuckets/h.MaxValue), 1), numBuckets)
		return index * h.MaxValue / numBuckets
	}
	if value <= 0 {
		return 0
	}
	if value <= MinLogUpperBound {
		return MinLogUpperBound
	}
	if value > MaxLogUpperBound {
		return math.Inf(1)
	}
	bandsPerDoubling := math.Exp2(MaxLogScale)
	return math.Exp2(math.Ceil(math.Log2(value)*bandsPerDoubling) / bandsPerDoubling)
}
