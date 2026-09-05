package querier

import (
	"math"
	"slices"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// heatmapColumn maps a bucket's upper bound to the count in it, holding one
// timestamp's cells. Keyed rather than indexed by band because the axis is only
// known once every cell has been seen.
type heatmapColumn map[float64]float64

func isValidBucketUpperBound(upperBound float64) bool {
	return !math.IsNaN(upperBound) && !math.IsInf(upperBound, -1)
}

// heatmapSeries accumulates one group's columns while the rows are read.
type heatmapSeries struct {
	labels             []*qbtypes.Label
	columnsByTimestamp map[int64]heatmapColumn
}

// heatmapAccumulator collects cells from either reader and folds them into one
// series per group.
type heatmapAccumulator struct {
	seriesByKey map[string]*heatmapSeries
	seriesOrder []string
	upperBounds map[float64]struct{}
}

func newHeatmapAccumulator() *heatmapAccumulator {
	return &heatmapAccumulator{
		seriesByKey: map[string]*heatmapSeries{},
		upperBounds: map[float64]struct{}{},
	}
}

// addCell files one cell under the group labelsKey identifies, keeping the
// labels from the first cell seen for it.
func (a *heatmapAccumulator) addCell(labelsKey string, lbls []*qbtypes.Label, ts int64, upperBound, count float64) {
	series, ok := a.seriesByKey[labelsKey]
	if !ok {
		series = &heatmapSeries{labels: lbls, columnsByTimestamp: map[int64]heatmapColumn{}}
		a.seriesByKey[labelsKey] = series
		a.seriesOrder = append(a.seriesOrder, labelsKey)
	}
	if series.columnsByTimestamp[ts] == nil {
		series.columnsByTimestamp[ts] = heatmapColumn{}
	}
	series.columnsByTimestamp[ts][upperBound] += count
	if !math.IsInf(upperBound, 1) {
		a.upperBounds[upperBound] = struct{}{}
	}
}

// foldSeries turns the collected cells into one series per group, in the order
// the groups first appeared.
func (a *heatmapAccumulator) foldSeries(queryWindow *qbtypes.TimeRange, stepMs uint64, queryName string) *qbtypes.TimeSeriesData {
	if len(a.seriesOrder) == 0 {
		return &qbtypes.TimeSeriesData{QueryName: queryName}
	}

	upperBounds := make([]float64, 0, len(a.upperBounds))
	for upperBound := range a.upperBounds {
		upperBounds = append(upperBounds, upperBound)
	}
	slices.Sort(upperBounds)

	// the band past the last upper bound is where the +Inf overflow lands
	bandIndexByUpperBound := make(map[float64]int, len(upperBounds)+1)
	for band, upperBound := range upperBounds {
		bandIndexByUpperBound[upperBound] = band
	}
	bandIndexByUpperBound[math.Inf(1)] = len(upperBounds)

	bucket := &qbtypes.AggregationBucket{
		Index:  0,
		Alias:  "__result_0",
		Meta:   qbtypes.AggregationMeta{Buckets: upperBounds},
		Series: make([]*qbtypes.TimeSeries, 0, len(a.seriesOrder)),
	}

	for _, labelsKey := range a.seriesOrder {
		accumulated := a.seriesByKey[labelsKey]

		timestamps := make([]int64, 0, len(accumulated.columnsByTimestamp))
		for ts := range accumulated.columnsByTimestamp {
			timestamps = append(timestamps, ts)
		}
		slices.Sort(timestamps)

		series := &qbtypes.TimeSeries{
			Labels: accumulated.labels,
			Values: make([]*qbtypes.TimeSeriesValue, 0, len(timestamps)),
		}
		for _, ts := range timestamps {
			values := make([]float64, len(upperBounds)+1)
			for upperBound, count := range accumulated.columnsByTimestamp[ts] {
				values[bandIndexByUpperBound[upperBound]] = count
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
	}
}
