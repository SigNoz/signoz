package querybuildertypesv5

import (
	"math"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	// A heatmap statement reports a row's bucket as (min, max] under these two
	// aliases, telling them apart from the single value column every other
	// aggregation returns. Only the upper bounds reach the response; the lower
	// ones are what says whether two rows bucketed the same way.
	HeatmapBucketMinColumn = "__bucket_min"
	HeatmapBucketMaxColumn = "__bucket_max"

	// A logs or traces heatmap counts events, so its field renders as count().
	heatmapCountExpression = "count()"

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

// HeatmapAggregationField returns the field a logs or traces heatmap buckets,
// written as the bare field, along with its key text as written. ok is false
// for any other aggregation.
func HeatmapAggregationField(expression string) (telemetrytypes.TelemetryFieldKey, string, bool) {
	keyText := strings.TrimSpace(expression)
	if keyText == "" || strings.ContainsAny(keyText, "() \t\n") {
		return telemetrytypes.TelemetryFieldKey{}, "", false
	}
	return telemetrytypes.GetFieldKeyFromKeyText(keyText), keyText, true
}

// HeatmapCountQuery splits a logs or traces heatmap query into the field its
// aggregation buckets and a copy of query that counts events in its place,
// which is what every cell holds. The copy keeps only events where the field
// exists.
func HeatmapCountQuery[T LogAggregation | TraceAggregation](query QueryBuilderQuery[T]) (*telemetrytypes.TelemetryFieldKey, QueryBuilderQuery[T], error) {
	if len(query.Aggregations) != 1 {
		return nil, query, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"a heatmap renders one bucket axis, but the query has %d aggregations", len(query.Aggregations))
	}

	query.Aggregations = slices.Clone(query.Aggregations)
	var expression *string
	switch aggregation := any(&query.Aggregations[0]).(type) {
	case *LogAggregation:
		expression = &aggregation.Expression
	case *TraceAggregation:
		expression = &aggregation.Expression
	}

	field, keyText, ok := HeatmapAggregationField(*expression)
	if !ok {
		return nil, query, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"a logs or traces heatmap counts events by the field named as its aggregation, got %q", *expression)
	}

	// An order on the aggregation names it by its expression.
	query.Order = slices.Clone(query.Order)
	for i := range query.Order {
		if query.Order[i].Key.Name == *expression {
			query.Order[i].Key.Name = heatmapCountExpression
		}
	}
	*expression = heatmapCountExpression

	exists := keyText + " EXISTS"
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		exists = "(" + query.Filter.Expression + ") AND " + exists
	}
	query.Filter = &Filter{Expression: exists}

	return &field, query, nil
}

// This cannot be called in validateBucketCounting cuz metric type is resolved in querier.go.
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
			"heatmaps are not supported for exponential histograms yet")
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

// ToDistributionData sums every series over all its steps, keeping the bucket
// axis, and ranks the percentiles over every series together. A partial step
// counts too, since what it holds was observed.
func (tsData *TimeSeriesData) ToDistributionData() *DistributionData {
	data := &DistributionData{QueryName: tsData.QueryName, Aggregations: make([]*DistributionAggregation, 0, len(tsData.Aggregations))}
	for _, aggBucket := range tsData.Aggregations {
		if aggBucket == nil {
			continue
		}
		aggregation := &DistributionAggregation{Index: aggBucket.Index, Alias: aggBucket.Alias, Meta: aggBucket.Meta, Distributions: make([]*Distribution, 0, len(aggBucket.Series))}
		totalCounts := make([]float64, len(aggBucket.Meta.Buckets)+1)
		for _, series := range aggBucket.Series {
			counts := make([]float64, len(totalCounts))
			for _, point := range series.Values {
				for i, count := range point.Values {
					if i < len(counts) {
						counts[i] += count
						totalCounts[i] += count
					}
				}
			}
			aggregation.Distributions = append(aggregation.Distributions, &Distribution{Labels: series.Labels, Counts: counts})
		}
		aggregation.Percentiles = newDistributionPercentiles(aggBucket.Meta.Buckets, totalCounts)
		data.Aggregations = append(data.Aggregations, aggregation)
	}
	return data
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

// AddHeatmapBucketsWithNoCounts spans the range from the rung below the lowest
// upper bound some series reached to the highest. Meta.Buckets leaves the ones
// in between out entirely, so without this a gap renders with its two sides
// touching and the lowest bucket reaches the floor of the axis.
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
		indexes[i] = bucketing.calculateIndexOfUpperBound(upperBound)
	}
	lowestIndexOnAxis, highestIndexOnAxis := slices.Min(indexes), slices.Max(indexes)

	// Start one rung below the lowest bucket that holds a count, so its lower
	// bound is on the axis. The axis may already begin with an empty bucket that
	// states that bound, in which case nothing is added beneath it.
	firstDenseIndex := lowestIndexOnAxis
	for _, series := range aggBucket.Series {
		for _, point := range series.Values {
			for i := offset; i < len(point.Values) && i < len(aggBucket.Meta.Buckets); i++ {
				if point.Values[i] != 0 {
					firstDenseIndex = min(firstDenseIndex, indexes[i-offset]-1)
				}
			}
		}
	}
	// The zero bucket is the floor, so no rung goes at or under it.
	if offset == 1 && bucketing.calculateUpperBoundAtIndex(firstDenseIndex) <= aggBucket.Meta.Buckets[0] {
		firstDenseIndex = lowestIndexOnAxis
	}

	denseUpperBounds := append([]float64{}, aggBucket.Meta.Buckets[:offset]...)
	for index := firstDenseIndex; index <= highestIndexOnAxis; index++ {
		denseUpperBounds = append(denseUpperBounds, bucketing.calculateUpperBoundAtIndex(index))
	}
	if len(denseUpperBounds) == len(aggBucket.Meta.Buckets) {
		return
	}

	// Counts map through their index rather than by matching upper bounds, so a
	// regenerated upper bound differing from ClickHouse's in its last bit still
	// lands where it came from.
	shiftedTo := make([]int, len(aggBucket.Meta.Buckets))
	for i, index := range indexes {
		shiftedTo[i+offset] = index - firstDenseIndex + offset
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

// calculateIndexOfUpperBound and calculateUpperBoundAtIndex are inverses over
// the axis being returned, so they read h.LogScale rather than the MaxLogScale
// ClickHouse bucketed at: k * maxValue / numBuckets on a linear axis,
// 2^(k / 2^scale) on a log one.
func (h HeatmapBucketing) calculateIndexOfUpperBound(upperBound float64) int {
	if h.Kind == BucketsKindLinear {
		return int(math.Round(upperBound * float64(h.NumBuckets) / h.MaxValue))
	}
	return int(math.Round(math.Log2(upperBound) * math.Exp2(float64(h.LogScale))))
}

func (h HeatmapBucketing) calculateUpperBoundAtIndex(index int) float64 {
	if h.Kind == BucketsKindLinear {
		return float64(index) * h.MaxValue / float64(h.NumBuckets)
	}
	return math.Exp2(float64(index) / math.Exp2(float64(h.LogScale)))
}

func newDistributionPercentiles(upperBounds, counts []float64) *DistributionPercentiles {
	total := 0.0
	for _, count := range counts {
		total += count
	}
	if total == 0 || len(upperBounds) == 0 {
		return nil
	}
	return &DistributionPercentiles{
		P50: bucketQuantile(0.5, total, upperBounds, counts),
		P75: bucketQuantile(0.75, total, upperBounds, counts),
		P90: bucketQuantile(0.9, total, upperBounds, counts),
		P95: bucketQuantile(0.95, total, upperBounds, counts),
		P99: bucketQuantile(0.99, total, upperBounds, counts),
	}
}

// bucketQuantile is histogram_quantile over per-bucket counts. q and total must
// be positive, so the bucket the rank lands in holds a count.
func bucketQuantile(q, total float64, upperBounds, counts []float64) float64 {
	rank := q * total
	cumulative := 0.0
	for i, upperBound := range upperBounds {
		if cumulative+counts[i] < rank {
			cumulative += counts[i]
			continue
		}
		if i == 0 && upperBound <= 0 {
			return upperBound
		}
		lowerBound := 0.0
		if i > 0 {
			lowerBound = upperBounds[i-1]
		}
		return lowerBound + (upperBound-lowerBound)*(rank-cumulative)/counts[i]
	}
	return upperBounds[len(upperBounds)-1]
}
