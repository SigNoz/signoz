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
func foldMatrixAsHeatmap(matrix promql.Matrix, queryWindow *qbv5.TimeRange, stepMs uint64, queryName string) (*qbv5.TimeSeriesData, error) {
	groups, groupOrder := collectCumulativeGroups(matrix)

	// An empty matrix is only ever the window having no data, but series that
	// all lack `le` say the expression itself cannot draw a heatmap.
	if len(matrix) > 0 && len(groups) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"the query returned no `le` labels to build a bucket axis from").
			WithAdditional("Keep `le` through the aggregation, e.g. sum by (le) (rate(metric_bucket[5m]))")
	}

	accumulator := newHeatmapAccumulator()
	for _, labelsKey := range groupOrder {
		if err := groups[labelsKey].addDifferencedCells(accumulator); err != nil {
			return nil, err
		}
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

func extractBucketUpperBound(metric labels.Labels) (float64, bool) {
	raw := metric.Get(promHistogramBucketLabel)
	if raw == "" {
		return 0, false
	}
	upperBound, err := strconv.ParseFloat(raw, 64)
	if err != nil || math.IsNaN(upperBound) || math.IsInf(upperBound, -1) {
		return 0, false
	}
	return upperBound, true
}

// extractHeatmapGroup returns a series' group labels — everything but `le`.
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

// each cell is its upper bound's cumulative count minus the one below it, and
// runs from that lower `le` up to its own. Nothing bounds the lowest one below:
// a classic histogram counts negative observations in it too.
func (g *promHeatmapGroup) addDifferencedCells(accumulator *heatmapAccumulator) error {
	for ts, cumulative := range g.cumulative {
		upperBounds := make([]float64, 0, len(cumulative))
		for upperBound := range cumulative {
			upperBounds = append(upperBounds, upperBound)
		}
		slices.Sort(upperBounds)

		previousCount := float64(0)
		previousBound := math.Inf(-1)
		for _, upperBound := range upperBounds {
			bounds := bucketBounds{Lower: previousBound, Upper: upperBound}
			if err := accumulator.addCell(g.labelsKey, g.labels, ts, bounds, math.Max(cumulative[upperBound]-previousCount, 0)); err != nil {
				return err
			}
			previousCount = cumulative[upperBound]
			previousBound = upperBound
		}
	}

	return nil
}
