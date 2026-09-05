package querier

import (
	"fmt"
	"math"
	"slices"
	"sort"
	"strconv"
	"strings"

	"github.com/prometheus/prometheus/model/labels"

	"github.com/prometheus/prometheus/promql"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// promHistogramBucketLabel is the label a classic histogram carries its
// cumulative upper bound on.
const promHistogramBucketLabel = "le"

// cumulativeColumn maps a bucket's upper bound to the cumulative count at it.
// Differencing turns it into the per-band counts a heatmapColumn holds.
type cumulativeColumn map[float64]float64

// promHeatmapGroup assembles one group across the several matrix series its `le`
// values arrive as, since differencing needs all of them.
type promHeatmapGroup struct {
	labels     []*qbv5.Label
	labelsKey  string
	cumulative map[int64]cumulativeColumn
}

// foldMatrixAsHeatmap folds a matrix of one cumulative series per (group, `le`)
// into one series per group whose points hold a count per band.
func foldMatrixAsHeatmap(matrix promql.Matrix, queryWindow *qbv5.TimeRange, stepMs uint64, queryName string) *qbv5.TimeSeriesData {
	groups, groupOrder := collectCumulativeGroups(matrix)

	accumulator := newHeatmapAccumulator()
	for _, labelsKey := range groupOrder {
		groups[labelsKey].addDifferencedCells(accumulator)
	}

	return accumulator.foldSeries(queryWindow, stepMs, queryName)
}

// collectCumulativeGroups reads the matrix into one group per label set. A series
// without `le` has no band to sit in, so an expression that dropped the label
// draws nothing.
func collectCumulativeGroups(matrix promql.Matrix) (groups map[string]*promHeatmapGroup, groupOrder []string) {
	groups = map[string]*promHeatmapGroup{}

	for _, promSeries := range matrix {
		upperBound, ok := extractBucketUpperBound(promSeries.Metric)
		if !ok {
			continue
		}

		lbls, labelsKey := extractHeatmapGroup(promSeries.Metric)
		group, ok := groups[labelsKey]
		if !ok {
			group = &promHeatmapGroup{labels: lbls, labelsKey: labelsKey, cumulative: map[int64]cumulativeColumn{}}
			groups[labelsKey] = group
			groupOrder = append(groupOrder, labelsKey)
		}

		for _, point := range promSeries.Floats {
			// skipping widens the band above onto the next upper bound that has
			// a count, which is what lagInFrame does with an absent row
			if math.IsNaN(point.F) || math.IsInf(point.F, 0) {
				continue
			}
			if group.cumulative[point.T] == nil {
				group.cumulative[point.T] = cumulativeColumn{}
			}
			group.cumulative[point.T][upperBound] = point.F
		}
	}

	return groups, groupOrder
}

// `le` is a string label, so `+Inf` arrives as one and parses to the overflow bound.
func extractBucketUpperBound(metric labels.Labels) (float64, bool) {
	raw := metric.Get(promHistogramBucketLabel)
	if raw == "" {
		return 0, false
	}
	upperBound, err := strconv.ParseFloat(raw, 64)
	if err != nil || !isValidBucketUpperBound(upperBound) {
		return 0, false
	}
	return upperBound, true
}

// extractHeatmapGroup returns a series' group labels — everything but `le` — and
// a key for them. The key holds names as well as values, unlike the row reader's:
// two matrix series can carry different label sets where two rows of one result
// cannot, so values alone would collide.
func extractHeatmapGroup(metric labels.Labels) ([]*qbv5.Label, string) {
	lbls := make([]*qbv5.Label, 0, metric.Len())
	pairs := make([]string, 0, metric.Len())

	metric.Range(func(l labels.Label) {
		if l.Name == promHistogramBucketLabel || excludePromLabel(l.Name) {
			return
		}
		lbls = append(lbls, &qbv5.Label{
			Key:   telemetrytypes.TelemetryFieldKey{Name: l.Name},
			Value: l.Value,
		})
		pairs = append(pairs, fmt.Sprintf("%s=%s", l.Name, l.Value))
	})

	sort.Strings(pairs)
	return lbls, strings.Join(pairs, ",")
}

// each cell is its upper bound's cumulative count less the one below it
func (g *promHeatmapGroup) addDifferencedCells(accumulator *heatmapAccumulator) {
	for ts, cumulative := range g.cumulative {
		upperBounds := make([]float64, 0, len(cumulative))
		for upperBound := range cumulative {
			upperBounds = append(upperBounds, upperBound)
		}
		slices.Sort(upperBounds)

		previous := float64(0)
		for _, upperBound := range upperBounds {
			accumulator.addCell(g.labelsKey, g.labels, ts, upperBound, math.Max(cumulative[upperBound]-previous, 0))
			previous = cumulative[upperBound]
		}
	}
}
