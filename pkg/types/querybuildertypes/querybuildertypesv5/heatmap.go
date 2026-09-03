package querybuildertypesv5

import (
	"maps"
	"math"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

const (
	// A positive value approaching zero runs its band index off to -inf, so
	// without a clamp one near-zero sample would stretch the axis by thousands
	// of bands once DensifyHeatmapAxis fills the empty ones in.
	MinLogBandIndex = -512 // 2^-32, about 2.3e-10
	MaxLogBandIndex = 1024 // 2^64, about 1.8e19
)

// LowestLogBoundary and HighestLogBoundary are the ends the log axis is clamped
// to. They do not vary with the requested scale.
var (
	LowestLogBoundary  = math.Exp2(float64(MinLogBandIndex) / math.Exp2(MaxLogScale))
	HighestLogBoundary = math.Exp2(float64(MaxLogBandIndex) / math.Exp2(MaxLogScale))
)

// HeatmapBucketing is the bucket axis a heatmap statement builds in ClickHouse,
// resolved from BucketOptions once the metric type is known. It stays nil for
// histograms, whose boundaries come from their own `le` labels.
type HeatmapBucketing struct {
	Kind BucketsKind
	// LogScale is always MaxLogScale; LogBucketsSpec.Scale coarsens the result
	// afterwards rather than changing this.
	LogScale int
	// MaxValue and NumBuckets are linear only.
	MaxValue   float64
	NumBuckets int
}

// ResolveBucketOptions fills in what the caller left unset. An absent
// BucketOptions resolves to the finest log axis, the one kind that needs nothing
// from the caller.
func (b *BucketOptions) ResolveBucketOptions() HeatmapBucketing {
	resolved := HeatmapBucketing{
		Kind:       BucketsKindLog,
		LogScale:   MaxLogScale,
		NumBuckets: DefaultNumBuckets,
	}
	if b == nil {
		return resolved
	}

	if spec, ok := b.Spec.(LinearBucketsSpec); ok {
		resolved.Kind = BucketsKindLinear
		resolved.MaxValue = spec.MaxValue
		if spec.NumBuckets > 0 {
			resolved.NumBuckets = spec.NumBuckets
		}
	}

	return resolved
}

// ResolveLogScale returns the axis resolution the caller wants back, which
// postprocessing folds the MaxLogScale axis down to.
func (b *BucketOptions) ResolveLogScale() int {
	if b == nil {
		return MaxLogScale
	}
	if spec, ok := b.Spec.(LogBucketsSpec); ok && spec.Scale != nil {
		return *spec.Scale
	}
	return MaxLogScale
}

// ResolveHeatmapBucketing picks the bucket axis a heatmap draws its rows from,
// and refuses the metric types that cannot produce one. It cannot live in
// validateHeatmap: MetricAggregation.Type is resolved from metadata after that.
func ResolveHeatmapBucketing(aggregation MetricAggregation, bucketOptions *BucketOptions) (*HeatmapBucketing, error) {
	switch aggregation.Type {
	case metrictypes.HistogramType:
		if bucketOptions != nil {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"bucketOptions are not supported for histogram metrics: %q takes its bucket axis from its own `le` labels, so nothing in the spec would be applied", aggregation.MetricName)
		}
		return nil, nil
	// A summary carries no boundaries of its own either, and its samples reach
	// the final select the same way a gauge's do, so it buckets identically.
	case metrictypes.GaugeType, metrictypes.SumType, metrictypes.SummaryType:
		bucketing := bucketOptions.ResolveBucketOptions()
		return &bucketing, nil
	case metrictypes.UnspecifiedType:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"heatmaps need a metric whose type is known: no type is recorded for %q, so its bucket axis cannot be chosen", aggregation.MetricName)
	case metrictypes.ExpHistogramType:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"heatmaps are not supported for exponential histograms yet: %q keeps its bucket counts in a sketch column, which needs its own reader", aggregation.MetricName)
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"heatmaps are not supported for %s metrics", aggregation.Type.StringValue())
	}
}

// MergeHeatmapAxes collects, per aggregation index, every bucket boundary any of
// tsData reached, so that halves holding different bands can be merged onto one
// axis. Only heatmap results carry boundaries, so it comes back empty for
// everything else and the realignment it feeds is a no-op.
func MergeHeatmapAxes(tsData ...*TimeSeriesData) map[int][]float64 {
	reached := map[int]map[float64]struct{}{}

	for _, data := range tsData {
		if data == nil {
			continue
		}
		for _, aggBucket := range data.Aggregations {
			if len(aggBucket.Meta.Buckets) == 0 {
				continue
			}
			if reached[aggBucket.Index] == nil {
				reached[aggBucket.Index] = map[float64]struct{}{}
			}
			for _, boundary := range aggBucket.Meta.Buckets {
				reached[aggBucket.Index][boundary] = struct{}{}
			}
		}
	}

	merged := make(map[int][]float64, len(reached))
	for index, boundarySet := range reached {
		merged[index] = slices.Sorted(maps.Keys(boundarySet))
	}

	return merged
}

// regroupAxis rewrites the aggregation onto boundaries, moving the count held in
// band i to targetBandIndexes[i] and summing where several bands land together.
// A band past the end of targetBandIndexes is the overflow, which stays the
// overflow on any axis.
func regroupAxis(aggBucket *AggregationBucket, boundaries []float64, targetBandIndexes []int) {
	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			if len(point.Values) == 0 {
				continue
			}
			regrouped := make([]float64, len(boundaries)+1)
			for band, count := range point.Values {
				if band >= len(targetBandIndexes) {
					regrouped[len(boundaries)] += count
					continue
				}
				regrouped[targetBandIndexes[band]] += count
			}
			point.Values = regrouped
		}
	}
	aggBucket.Meta.Buckets = boundaries
}

// RealignHeatmapValues moves every point's per-bucket counts from the axis they
// were read against onto onto, matching on boundary rather than position. Two
// ranges of one query disagree on their axes when a histogram's `le` labels
// change partway through a window, or when one range's data never reached a
// band the other did.
func RealignHeatmapValues(series []*TimeSeries, from, onto []float64) {
	if len(onto) == 0 || slices.Equal(from, onto) {
		return
	}

	bandIndexByBoundary := make(map[float64]int, len(onto))
	for band, boundary := range onto {
		bandIndexByBoundary[boundary] = band
	}

	for _, s := range series {
		for _, point := range s.Values {
			if len(point.Values) == 0 {
				continue
			}
			realigned := make([]float64, len(onto)+1)
			for band, count := range point.Values {
				if band >= len(from) {
					realigned[len(onto)] = count
					break
				}
				if targetBand, ok := bandIndexByBoundary[from[band]]; ok {
					realigned[targetBand] = count
				}
			}
			point.Values = realigned
		}
	}
}

// DownscaleHeatmapAxis folds a log axis bucketed at fromScale down to toScale,
// merging every 2^(fromScale-toScale) adjacent bands into one. The coarser
// boundaries are a subset of the finer ones, so the fold is exact.
func DownscaleHeatmapAxis(tsData *TimeSeriesData, fromScale, toScale int) {
	if tsData == nil || toScale >= fromScale {
		return
	}
	for _, aggBucket := range tsData.Aggregations {
		downscaleAggregationAxis(aggBucket, fromScale, toScale)
	}
}

func downscaleAggregationAxis(aggBucket *AggregationBucket, fromScale, toScale int) {
	if aggBucket == nil || len(aggBucket.Meta.Buckets) == 0 {
		return
	}

	factor := int(math.Exp2(float64(fromScale - toScale)))

	// Bands merge by their index in the exponential mapping, not by position in
	// Meta.Buckets, which lists only the boundaries some series reached.
	coarse := make([]float64, 0, len(aggBucket.Meta.Buckets))
	targetBandIndexes := make([]int, len(aggBucket.Meta.Buckets))
	seen := make(map[float64]int, len(aggBucket.Meta.Buckets))
	for band, boundary := range aggBucket.Meta.Buckets {
		merged := coarsenHeatmapBoundary(boundary, fromScale, toScale, factor)
		coarseBandIndex, ok := seen[merged]
		if !ok {
			coarseBandIndex = len(coarse)
			coarse = append(coarse, merged)
			seen[merged] = coarseBandIndex
		}
		targetBandIndexes[band] = coarseBandIndex
	}

	regroupAxis(aggBucket, coarse, targetBandIndexes)
}

// coarsenHeatmapBoundary moves a boundary from the fromScale exponential axis
// onto the toScale one. The zero band has no exponent to rescale and stays put.
func coarsenHeatmapBoundary(boundary float64, fromScale, toScale, factor int) float64 {
	if boundary <= 0 || math.IsInf(boundary, 0) || math.IsNaN(boundary) {
		return boundary
	}
	index := int(math.Round(math.Log2(boundary) * math.Exp2(float64(fromScale))))
	merged := int(math.Ceil(float64(index) / float64(factor)))
	return math.Exp2(float64(merged) / math.Exp2(float64(toScale)))
}

// DensifyHeatmapAxis fills in the bands no series reached, which are left out of
// Meta.Buckets entirely and would otherwise render with the two sides of a gap
// touching.
//
// Only a value-derived axis can be densified: its boundaries come from an index
// that is a pure function of the value, so the ones in between are known without
// having seen them. Nothing says what sits between two `le` labels.
func DensifyHeatmapAxis(tsData *TimeSeriesData, bucketing HeatmapBucketing) {
	if tsData == nil {
		return
	}
	for _, aggBucket := range tsData.Aggregations {
		densifyAggregationAxis(aggBucket, bucketing)
	}
}

func densifyAggregationAxis(aggBucket *AggregationBucket, bucketing HeatmapBucketing) {
	if aggBucket == nil || len(aggBucket.Meta.Buckets) == 0 {
		return
	}

	// The zero band holds everything at or below zero. It has no index on either
	// axis and sits below every other boundary, so it keeps band 0 and the fill
	// runs over the rest.
	offset := 0
	if aggBucket.Meta.Buckets[0] <= 0 {
		offset = 1
	}
	positive := aggBucket.Meta.Buckets[offset:]
	if len(positive) == 0 {
		return
	}

	// Only finite boundaries have a band index, and the fill sizes a slice from
	// one. Nothing should put +Inf or NaN on the axis, but bail if it happens.
	indexes := make([]int, len(positive))
	for i, boundary := range positive {
		if math.IsInf(boundary, 0) || math.IsNaN(boundary) {
			return
		}
		indexes[i] = bucketing.calculateBandIndex(boundary)
	}
	lowest, highest := slices.Min(indexes), slices.Max(indexes)

	dense := append([]float64{}, aggBucket.Meta.Buckets[:offset]...)
	for index := lowest; index <= highest; index++ {
		dense = append(dense, bucketing.calculateBandBoundary(index))
	}
	if len(dense) == len(aggBucket.Meta.Buckets) {
		return
	}

	// Bands map through their index rather than by matching boundaries, so a
	// regenerated boundary differing from ClickHouse's in its last bit still
	// lands on the band it came from.
	targetBandIndexes := make([]int, len(aggBucket.Meta.Buckets))
	for i, index := range indexes {
		targetBandIndexes[i+offset] = index - lowest + offset
	}

	regroupAxis(aggBucket, dense, targetBandIndexes)
}

// calculateBandIndex and calculateBandBoundary are inverses, and match the
// expressions the statement builder renders: k * maxValue / numBuckets on a
// linear axis, 2^(k / 2^scale) on a log one.
func (h HeatmapBucketing) calculateBandIndex(boundary float64) int {
	if h.Kind == BucketsKindLinear {
		return int(math.Round(boundary * float64(h.NumBuckets) / h.MaxValue))
	}
	return int(math.Round(math.Log2(boundary) * math.Exp2(float64(h.LogScale))))
}

func (h HeatmapBucketing) calculateBandBoundary(index int) float64 {
	if h.Kind == BucketsKindLinear {
		return float64(index) * h.MaxValue / float64(h.NumBuckets)
	}
	return math.Exp2(float64(index) / math.Exp2(float64(h.LogScale)))
}

// BucketTimeSeriesValues turns one value per (series, timestamp) into heatmap
// cells on the axis bucketing describes, which is what ClickHouse does for a
// gauge or sum. A formula has no statement to carry the boundary expression, so
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

	// +Inf is the open-above overflow rather than a boundary of its own, and a
	// NaN value has no band at all
	boundarySet := map[float64]struct{}{}
	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			boundary := bucketing.calculateValueBoundary(point.Value)
			if !math.IsNaN(boundary) && !math.IsInf(boundary, 0) {
				boundarySet[boundary] = struct{}{}
			}
		}
	}
	boundaries := slices.Sorted(maps.Keys(boundarySet))

	bandIndexByBoundary := make(map[float64]int, len(boundaries))
	for band, boundary := range boundaries {
		bandIndexByBoundary[boundary] = band
	}

	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			boundary := bucketing.calculateValueBoundary(point.Value)
			point.Values = make([]float64, len(boundaries)+1)
			point.Value = 0
			switch {
			case math.IsNaN(boundary):
			case math.IsInf(boundary, 1):
				point.Values[len(boundaries)] = 1
			default:
				point.Values[bandIndexByBoundary[boundary]] = 1
			}
		}
	}

	aggBucket.Meta.Buckets = boundaries
}

// calculateValueBoundary renders the upper bound of the band value falls in. It
// is the Go side of the expression the statement builder emits and has to stay
// identical to it: a formula heatmap and a metric heatmap that disagreed here
// would put their bands in different places.
func (h HeatmapBucketing) calculateValueBoundary(value float64) float64 {
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
	if value <= LowestLogBoundary {
		return LowestLogBoundary
	}
	if value > HighestLogBoundary {
		return math.Inf(1)
	}
	bandsPerDoubling := math.Exp2(float64(h.LogScale))
	return math.Exp2(math.Ceil(math.Log2(value)*bandsPerDoubling) / bandsPerDoubling)
}
