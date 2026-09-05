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

	"github.com/SigNoz/signoz/pkg/errors"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// promHistogramBucketLabel is the label a classic histogram carries its
// cumulative upper bound on, in PromQL as in the metric itself.
const promHistogramBucketLabel = "le"

// promHeatmapGroup accumulates one group's cumulative counts. `le` series are
// separate series in a matrix, so a group is assembled across several of them
// and the differencing can only run once they have all been read.
type promHeatmapGroup struct {
	labels     []*qbv5.Label
	labelsKey  string
	cumulative map[int64]heatmapColumn
}

// foldMatrixAsHeatmap folds a classic histogram matrix, one series per (group,
// `le`) carrying the cumulative count at that boundary, into one series per
// group whose points hold a count per band.
func foldMatrixAsHeatmap(matrix promql.Matrix, queryWindow *qbv5.TimeRange, stepMs uint64, queryName string) (*qbv5.TimeSeriesData, error) {
	groups, groupOrder, sawBucketLabel := collectCumulativeGroups(matrix)

	if len(matrix) > 0 && !sawBucketLabel {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"promql heatmap needs a %q label to draw its bucket axis from, and %q returned none: keep it in the result, as in `sum by (%s) (increase(metric_bucket[5m]))`",
			promHistogramBucketLabel, queryName, promHistogramBucketLabel)
	}

	accumulator := newHeatmapAccumulator()
	for _, labelsKey := range groupOrder {
		groups[labelsKey].addDifferencedCells(accumulator)
	}

	return accumulator.foldSeries(queryWindow, stepMs, queryName), nil
}

// collectCumulativeGroups reads the matrix into one group per label set, each
// holding the cumulative count at every (timestamp, boundary) pair.
// sawBucketLabel reports whether any series carried `le` at all.
func collectCumulativeGroups(matrix promql.Matrix) (groups map[string]*promHeatmapGroup, groupOrder []string, sawBucketLabel bool) {
	groups = map[string]*promHeatmapGroup{}

	for _, promSeries := range matrix {
		boundary, ok := extractBucketBoundary(promSeries.Metric)
		if !ok {
			continue
		}
		sawBucketLabel = true

		lbls, labelsKey := extractHeatmapGroup(promSeries.Metric)
		group, ok := groups[labelsKey]
		if !ok {
			group = &promHeatmapGroup{labels: lbls, labelsKey: labelsKey, cumulative: map[int64]heatmapColumn{}}
			groups[labelsKey] = group
			groupOrder = append(groupOrder, labelsKey)
		}

		for _, point := range promSeries.Floats {
			// A non-finite cumulative count has nothing to difference against.
			// Skipping the point leaves the band above it differenced against
			// the next boundary that does have one, which is what lagInFrame
			// does with an absent row on the builder path.
			if math.IsNaN(point.F) || math.IsInf(point.F, 0) {
				continue
			}
			if group.cumulative[point.T] == nil {
				group.cumulative[point.T] = heatmapColumn{}
			}
			group.cumulative[point.T][boundary] = point.F
		}
	}

	return groups, groupOrder, sawBucketLabel
}

// addDifferencedCells turns the group's cumulative counts into one cell per
// band, differencing each boundary against the one below it.
func (g *promHeatmapGroup) addDifferencedCells(accumulator *heatmapAccumulator) {
	for ts, cumulative := range g.cumulative {
		boundaries := make([]float64, 0, len(cumulative))
		for boundary := range cumulative {
			boundaries = append(boundaries, boundary)
		}
		slices.Sort(boundaries)

		previous := float64(0)
		for _, boundary := range boundaries {
			accumulator.addCell(g.labelsKey, g.labels, ts, boundary, math.Max(cumulative[boundary]-previous, 0))
			previous = cumulative[boundary]
		}
	}
}

// extractBucketBoundary reads the `le` label as a boundary. The label is a
// string, so `+Inf` arrives as one and parses to the overflow boundary.
func extractBucketBoundary(metric labels.Labels) (float64, bool) {
	raw := metric.Get(promHistogramBucketLabel)
	if raw == "" {
		return 0, false
	}
	boundary, err := strconv.ParseFloat(raw, 64)
	if err != nil || !canBoundBand(boundary) {
		return 0, false
	}
	return boundary, true
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
