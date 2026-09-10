package querier

import (
	"math"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// bucketBounds holds the values in (Lower, Upper]. Only Upper reaches the
// response; Lower is what says whether two rows bucketed the same way.
type bucketBounds struct {
	Lower float64
	Upper float64
}

// heatmapColumn maps a bucket to the count in it, holding one timestamp's cells.
// Keyed rather than indexed by bucket because the axis is only known once every
// cell has been seen.
type heatmapColumn map[bucketBounds]float64

func isValidBucketBounds(bounds bucketBounds) bool {
	return !math.IsNaN(bounds.Lower) && !math.IsNaN(bounds.Upper) &&
		!math.IsInf(bounds.Upper, -1) && bounds.Lower < bounds.Upper
}

// heatmapSeries accumulates one group's columns while the rows are read.
type heatmapSeries struct {
	labels            []*qbtypes.Label
	timestampToColumn map[int64]heatmapColumn
}

// heatmapAccumulator collects cells from either reader and folds them into one
// series per group.
type heatmapAccumulator struct {
	keyToSeries  map[string]*heatmapSeries
	seriesOrder  []string
	upperToLower map[float64]float64
}

func newHeatmapAccumulator() *heatmapAccumulator {
	return &heatmapAccumulator{
		keyToSeries:  map[string]*heatmapSeries{},
		upperToLower: map[float64]float64{},
	}
}

// addCell files one cell under the group labelsKey identifies, keeping the
// labels from the first cell seen for it. A response carrying upper bounds
// alone cannot express two rows cutting the same bucket differently, so the
// second of them is rejected here.
func (a *heatmapAccumulator) addCell(labelsKey string, lbls []*qbtypes.Label, ts int64, bounds bucketBounds, count float64) error {
	if seenLowerBound, isUpperBoundSeenBefore := a.upperToLower[bounds.Upper]; isUpperBoundSeenBefore && seenLowerBound != bounds.Lower {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"the bucket ending at %v is reported as starting at both %v and %v", bounds.Upper, seenLowerBound, bounds.Lower).
			WithAdditional("Every row of a heatmap has to cut its buckets the same way")
	}
	a.upperToLower[bounds.Upper] = bounds.Lower

	series, found := a.keyToSeries[labelsKey]
	if !found {
		series = &heatmapSeries{labels: lbls, timestampToColumn: map[int64]heatmapColumn{}}
		a.keyToSeries[labelsKey] = series
		a.seriesOrder = append(a.seriesOrder, labelsKey)
	}
	if series.timestampToColumn[ts] == nil {
		series.timestampToColumn[ts] = heatmapColumn{}
	}
	series.timestampToColumn[ts][bounds] += count

	return nil
}

// resolveBucketAxis lists the upper bounds the counts are indexed against. A
// gap goes on the axis as its own empty bucket, or the bucket above it would
// widen to cover a range nothing bucketed.
func (a *heatmapAccumulator) resolveBucketAxis() ([]float64, error) {
	upperBounds := make([]float64, 0, len(a.upperToLower))
	for upperBound := range a.upperToLower {
		if !math.IsInf(upperBound, 1) {
			upperBounds = append(upperBounds, upperBound)
		}
	}
	slices.Sort(upperBounds)

	axis := make([]float64, 0, 2*len(upperBounds))
	for index, upperBound := range upperBounds {
		if index > 0 {
			previousUpperBound := upperBounds[index-1]
			switch lowerBoundForCurrUpperBound := a.upperToLower[upperBound]; {
			case lowerBoundForCurrUpperBound < previousUpperBound:
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
					"the buckets ending at %v and %v overlap", previousUpperBound, upperBound).
					WithAdditional("Every row of a heatmap has to cut its buckets the same way")
			case lowerBoundForCurrUpperBound > previousUpperBound:
				axis = append(axis, lowerBoundForCurrUpperBound)
			}
		}
		axis = append(axis, upperBound)
	}

	return axis, nil
}

// foldSeries turns the collected cells into one series per group, in the order
// the groups first appeared.
func (a *heatmapAccumulator) foldSeries(queryWindow *qbtypes.TimeRange, stepMs uint64, queryName string) (*qbtypes.TimeSeriesData, error) {
	if len(a.seriesOrder) == 0 {
		return &qbtypes.TimeSeriesData{QueryName: queryName}, nil
	}

	upperBounds, err := a.resolveBucketAxis()
	if err != nil {
		return nil, err
	}

	upperBoundToIndex := make(map[float64]int, len(upperBounds)+1)
	for index, upperBound := range upperBounds {
		upperBoundToIndex[upperBound] = index
	}
	// the index past the last upper bound is where the +Inf overflow lands
	upperBoundToIndex[math.Inf(1)] = len(upperBounds)

	bucket := &qbtypes.AggregationBucket{
		Index:  0,
		Alias:  "__result_0",
		Meta:   qbtypes.AggregationMeta{Buckets: upperBounds},
		Series: make([]*qbtypes.TimeSeries, 0, len(a.seriesOrder)),
	}

	for _, labelsKey := range a.seriesOrder {
		accumulated := a.keyToSeries[labelsKey]

		timestamps := make([]int64, 0, len(accumulated.timestampToColumn))
		for ts := range accumulated.timestampToColumn {
			timestamps = append(timestamps, ts)
		}
		slices.Sort(timestamps)

		series := &qbtypes.TimeSeries{
			Labels: accumulated.labels,
			Values: make([]*qbtypes.TimeSeriesValue, 0, len(timestamps)),
		}
		for _, ts := range timestamps {
			values := make([]float64, len(upperBounds)+1)
			for bounds, count := range accumulated.timestampToColumn[ts] {
				values[upperBoundToIndex[bounds.Upper]] += count
			}
			series.Values = append(series.Values, &qbtypes.TimeSeriesValue{
				Timestamp: ts,
				Values:    values,
				Partial:   isPartialValue(ts, queryWindow, stepMs),
			})
		}
		bucket.Series = append(bucket.Series, series)
	}

	return &qbtypes.TimeSeriesData{
		QueryName:    queryName,
		Aggregations: []*qbtypes.AggregationBucket{bucket},
	}, nil
}
