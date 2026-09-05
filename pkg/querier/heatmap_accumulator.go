package querier

import (
	"math"
	"slices"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// heatmapColumn maps a bucket's upper boundary to the count in it, holding one
// timestamp's cells. Keyed rather than indexed by band because the axis is only
// known once every cell has been seen.
type heatmapColumn map[float64]float64

// canBoundBand reports whether a cell's boundary can serve as a band's upper
// bound. +Inf can: it is what the open-above overflow is keyed on. NaN and -Inf
// bound nothing, so a cell carrying either is dropped.
func canBoundBand(boundary float64) bool {
	return !math.IsNaN(boundary) && !math.IsInf(boundary, -1)
}

// heatmapSeries accumulates one group's columns while the rows are read.
type heatmapSeries struct {
	labels []*qbtypes.Label
	counts map[int64]heatmapColumn
}

// heatmapAccumulator collects cells from either reader and folds them into one
// series per group.
type heatmapAccumulator struct {
	seriesByKey map[string]*heatmapSeries
	seriesOrder []string
	boundaries  map[float64]struct{}
}

func newHeatmapAccumulator() *heatmapAccumulator {
	return &heatmapAccumulator{
		seriesByKey: map[string]*heatmapSeries{},
		boundaries:  map[float64]struct{}{},
	}
}

// addCell files one cell under the group labelsKey identifies, keeping the
// labels from the first cell seen for it.
func (a *heatmapAccumulator) addCell(labelsKey string, lbls []*qbtypes.Label, ts int64, boundary, count float64) {
	series, ok := a.seriesByKey[labelsKey]
	if !ok {
		series = &heatmapSeries{labels: lbls, counts: map[int64]heatmapColumn{}}
		a.seriesByKey[labelsKey] = series
		a.seriesOrder = append(a.seriesOrder, labelsKey)
	}
	if series.counts[ts] == nil {
		series.counts[ts] = heatmapColumn{}
	}
	series.counts[ts][boundary] += count
	if !math.IsInf(boundary, 1) {
		a.boundaries[boundary] = struct{}{}
	}
}

// foldSeries turns the collected cells into one series per group, in the order
// the groups first appeared.
func (a *heatmapAccumulator) foldSeries(queryWindow *qbtypes.TimeRange, stepMs uint64, queryName string) *qbtypes.TimeSeriesData {
	if len(a.seriesOrder) == 0 {
		return &qbtypes.TimeSeriesData{QueryName: queryName}
	}

	boundaries := make([]float64, 0, len(a.boundaries))
	for boundary := range a.boundaries {
		boundaries = append(boundaries, boundary)
	}
	slices.Sort(boundaries)

	// the band past the last boundary is where the +Inf overflow lands
	bandIndexByBoundary := make(map[float64]int, len(boundaries)+1)
	for band, boundary := range boundaries {
		bandIndexByBoundary[boundary] = band
	}
	bandIndexByBoundary[math.Inf(1)] = len(boundaries)

	bucket := &qbtypes.AggregationBucket{
		Index:  0,
		Alias:  "__result_0",
		Meta:   qbtypes.AggregationMeta{Buckets: boundaries},
		Series: make([]*qbtypes.TimeSeries, 0, len(a.seriesOrder)),
	}

	for _, labelsKey := range a.seriesOrder {
		accumulated := a.seriesByKey[labelsKey]

		timestamps := make([]int64, 0, len(accumulated.counts))
		for ts := range accumulated.counts {
			timestamps = append(timestamps, ts)
		}
		slices.Sort(timestamps)

		series := &qbtypes.TimeSeries{
			Labels: accumulated.labels,
			Values: make([]*qbtypes.TimeSeriesValue, 0, len(timestamps)),
		}
		for _, ts := range timestamps {
			values := make([]float64, len(boundaries)+1)
			for boundary, count := range accumulated.counts[ts] {
				values[bandIndexByBoundary[boundary]] = count
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
