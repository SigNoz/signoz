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
// cumulative upper bound on, in PromQL as in the metric itself.
const promHistogramBucketLabel = "le"

// cumulativeColumn maps a bucket's upper bound to the cumulative count at it,
// the form a classic histogram's `le` series arrive in. Differencing along the
// upper bounds turns it into the per-band counts a heatmapColumn holds.
type cumulativeColumn map[float64]float64

// promHeatmapGroup accumulates one group's cumulative counts. `le` series are
// separate series in a matrix, so a group is assembled across several of them
// and the differencing can only run once they have all been read.
type promHeatmapGroup struct {
	labels     []*qbv5.Label
	labelsKey  string
	cumulative map[int64]cumulativeColumn
}

// foldMatrixAsHeatmap folds a classic histogram matrix, one series per (group,
// `le`) carrying the cumulative count at that upper bound, into one series per
// group whose points hold a count per band.
func foldMatrixAsHeatmap(matrix promql.Matrix, queryWindow *qbv5.TimeRange, stepMs uint64, queryName string) *qbv5.TimeSeriesData {
	groups, groupOrder := collectCumulativeGroups(matrix)

	accumulator := newHeatmapAccumulator()
	for _, labelsKey := range groupOrder {
		groups[labelsKey].addDifferencedCells(accumulator)
	}

	return accumulator.foldSeries(queryWindow, stepMs, queryName)
}

// collectCumulativeGroups reads the matrix into one group per label set, each
// holding the cumulative count at every (timestamp, upper bound) pair. A series
// without `le` has no band to sit in and is skipped, so an expression that
// dropped the label draws nothing.
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
			// A non-finite cumulative count has nothing to difference against.
			// Skipping the point leaves the band above it differenced against
			// the next upper bound that does have one, which is what lagInFrame
			// does with an absent row on the builder path.
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

// addDifferencedCells turns the group's cumulative counts into one cell per
// band, differencing each upper bound against the one below it.
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

// extractBucketUpperBound reads the `le` label as an upper bound. The label is a
// string, so `+Inf` arrives as one and parses to the overflow bound.
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

// extractHeatmapGroup returns the labels identifying a series' group — every
// label except `le`, which becomes the Y axis — and a key for it.
//
// The key holds names as well as values, unlike the row reader's, because two
// matrix series can carry different label sets where two rows of one result
// cannot, and values alone would collide across them.
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
