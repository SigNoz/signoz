package querier

import (
	"fmt"
	"math"
	"slices"
	"strings"
	"time"

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

type heatmapAxisBucketDetails struct {
	bounds bucketBounds
	labels []*qbtypes.Label
	ts     int64
}

func (b heatmapAxisBucketDetails) describe() string {
	at := time.UnixMilli(b.ts).UTC().Format(time.RFC3339)
	if len(b.labels) == 0 {
		return at
	}

	pairs := make([]string, 0, len(b.labels))
	for _, label := range b.labels {
		pairs = append(pairs, fmt.Sprintf("%s=%v", label.Key.Name, label.Value))
	}
	return fmt.Sprintf("%s at %s", strings.Join(pairs, ", "), at)
}

// heatmapSeries accumulates one group's columns while the rows are read.
type heatmapSeries struct {
	labels            []*qbtypes.Label
	timestampToColumn map[int64]heatmapColumn
}

// heatmapAccumulator collects cells from either reader and folds them into one
// series per group.
type heatmapAccumulator struct {
	keyToSeries        map[string]*heatmapSeries
	seriesOrder        []string
	upperBoundToBucket map[float64]heatmapAxisBucketDetails
}

func newHeatmapAccumulator() *heatmapAccumulator {
	return &heatmapAccumulator{
		keyToSeries:        map[string]*heatmapSeries{},
		upperBoundToBucket: map[float64]heatmapAxisBucketDetails{},
	}
}

// addCell files one cell under the group labelsKey identifies, keeping the
// labels from the first cell seen for it. A response carrying upper bounds
// alone cannot express two rows cutting the same bucket differently, so the
// second of them is rejected here.
func (a *heatmapAccumulator) addCell(labelsKey string, lbls []*qbtypes.Label, ts int64, bounds bucketBounds, count float64) error {
	bucketToAdd := heatmapAxisBucketDetails{bounds: bounds, labels: lbls, ts: ts}

	if seenBucket, isUpperBoundSeenBefore := a.upperBoundToBucket[bounds.Upper]; isUpperBoundSeenBefore && seenBucket.bounds.Lower != bounds.Lower {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"the bucket ending at %v starts at %v for %s and at %v for %s",
			bounds.Upper, seenBucket.bounds.Lower, seenBucket.describe(), bounds.Lower, bucketToAdd.describe()).
			WithAdditional("A heatmap draws one set of buckets, so every row has to report the same ones")
	}
	a.upperBoundToBucket[bounds.Upper] = bucketToAdd

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
	upperBounds := make([]float64, 0, len(a.upperBoundToBucket))
	for upperBound := range a.upperBoundToBucket {
		if !math.IsInf(upperBound, 1) {
			upperBounds = append(upperBounds, upperBound)
		}
	}
	slices.Sort(upperBounds)

	axis := make([]float64, 0, 2*len(upperBounds))
	for index, upperBound := range upperBounds {
		currentBucket := a.upperBoundToBucket[upperBound]
		if index > 0 {
			previousBucket := a.upperBoundToBucket[upperBounds[index-1]]
			switch {
			case currentBucket.bounds.Lower < previousBucket.bounds.Upper:
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
					"the bucket %v to %v for %s covers values already in the bucket %v to %v for %s",
					currentBucket.bounds.Lower, currentBucket.bounds.Upper, currentBucket.describe(),
					previousBucket.bounds.Lower, previousBucket.bounds.Upper, previousBucket.describe()).
					WithAdditional("A heatmap draws one set of buckets, so every row has to report the same ones")
			case currentBucket.bounds.Lower > previousBucket.bounds.Upper:
				axis = append(axis, currentBucket.bounds.Lower)
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
