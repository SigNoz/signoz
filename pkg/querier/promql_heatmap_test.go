package querier

import (
	"log/slog"
	"math"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFoldMatrixAsHeatmapDifferencesAlongTheBucketLabel(t *testing.T) {
	firstTimestamp := int64(1710000000000)
	secondTimestamp := int64(1710000060000)

	matrix := promql.Matrix{
		{
			Metric: labels.FromStrings("service.name", "cart", "le", "5"),
			Floats: []promql.FPoint{{T: firstTimestamp, F: 3}, {T: secondTimestamp, F: 4}},
		},
		{
			Metric: labels.FromStrings("service.name", "cart", "le", "10"),
			Floats: []promql.FPoint{{T: firstTimestamp, F: 10}, {T: secondTimestamp, F: 4}},
		},
		{
			Metric: labels.FromStrings("service.name", "cart", "le", "+Inf"),
			Floats: []promql.FPoint{{T: firstTimestamp, F: 11}, {T: secondTimestamp, F: 4}},
		},
		{
			Metric: labels.FromStrings("service.name", "pay", "le", "5"),
			Floats: []promql.FPoint{{T: firstTimestamp, F: 0}, {T: secondTimestamp, F: 0}},
		},
		{
			Metric: labels.FromStrings("service.name", "pay", "le", "10"),
			Floats: []promql.FPoint{{T: firstTimestamp, F: 2}, {T: secondTimestamp, F: 0}},
		},
		{
			Metric: labels.FromStrings("service.name", "pay", "le", "+Inf"),
			Floats: []promql.FPoint{{T: firstTimestamp, F: 2}, {T: secondTimestamp, F: 6}},
		},
	}

	data := foldMatrixAsHeatmap(matrix, &qbv5.TimeRange{From: 1710000000000, To: 1710000120000}, uint64(time.Minute.Milliseconds()), "A")
	require.Len(t, data.Aggregations, 1)

	aggregation := data.Aggregations[0]
	// +Inf is not a boundary; it is the slot past the last one
	assert.Equal(t, []float64{5, 10}, aggregation.Meta.Buckets)
	require.Len(t, aggregation.Series, 2)

	cart := aggregation.Series[0]
	require.Len(t, cart.Labels, 1)
	assert.Equal(t, "service.name", cart.Labels[0].Key.Name)
	assert.Equal(t, "cart", cart.Labels[0].Value)
	require.Len(t, cart.Values, 2)
	assert.Equal(t, firstTimestamp, cart.Values[0].Timestamp)
	assert.Equal(t, []float64{3, 7, 1}, cart.Values[0].Values)
	assert.Equal(t, []float64{4, 0, 0}, cart.Values[1].Values)

	pay := aggregation.Series[1]
	assert.Equal(t, "pay", pay.Labels[0].Value)
	assert.Equal(t, []float64{0, 2, 0}, pay.Values[0].Values)
	assert.Equal(t, []float64{0, 0, 6}, pay.Values[1].Values)
}

func TestToResultShapesAHeatmapRequestAsCells(t *testing.T) {
	at := int64(1710000000000)
	q := &promqlQuery{
		query:       qbv5.PromQuery{Name: "A", Step: qbv5.Step{Duration: time.Minute}},
		tr:          qbv5.TimeRange{From: 1710000000000, To: 1710000060000},
		requestType: qbv5.RequestTypeHeatmap,
	}
	matrix := promql.Matrix{
		{Metric: labels.FromStrings("le", "5"), Floats: []promql.FPoint{{T: at, F: 3}}},
		{Metric: labels.FromStrings("le", "+Inf"), Floats: []promql.FPoint{{T: at, F: 8}}},
	}

	var mu sync.Mutex
	var rows, bytes uint64
	result := q.toResult(matrix, nil, time.Now(), &mu, &rows, &bytes)
	assert.Equal(t, qbv5.RequestTypeHeatmap, result.Type)

	tsData, ok := result.Value.(*qbv5.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)
	assert.Equal(t, []float64{5}, tsData.Aggregations[0].Meta.Buckets)

	point := tsData.Aggregations[0].Series[0].Values[0]
	// counts, not a single value: the +Inf series becomes the overflow slot
	assert.Equal(t, []float64{3, 5}, point.Values)
	assert.Zero(t, point.Value)
}

func TestToResultDrawsNothingForAHeatmapRequestWithoutTheBucketLabel(t *testing.T) {
	q := &promqlQuery{
		query:       qbv5.PromQuery{Name: "A", Step: qbv5.Step{Duration: time.Minute}},
		tr:          qbv5.TimeRange{From: 1710000000000, To: 1710000060000},
		requestType: qbv5.RequestTypeHeatmap,
	}
	matrix := promql.Matrix{
		{Metric: labels.FromStrings("service.name", "cart"), Floats: []promql.FPoint{{T: 1710000000000, F: 3}}},
	}

	var mu sync.Mutex
	var rows, bytes uint64
	result := q.toResult(matrix, nil, time.Now(), &mu, &rows, &bytes)

	tsData, ok := result.Value.(*qbv5.TimeSeriesData)
	require.True(t, ok)
	assert.Empty(t, tsData.Aggregations)
}

// The cache key is the fingerprint alone, so two request types over one
// expression must not produce the same one — a time series payload served to a
// heatmap request has no axis and reads back as a single collapsed band.
func TestFingerprintSeparatesHeatmapFromTimeSeries(t *testing.T) {
	fingerprintFor := func(requestType qbv5.RequestType) string {
		q := &promqlQuery{
			logger:      slog.New(slog.DiscardHandler),
			query:       qbv5.PromQuery{Name: "A", Query: "sum by (le) (increase(signoz_latency_bucket[5m]))", Step: qbv5.Step{Duration: time.Minute}},
			tr:          qbv5.TimeRange{From: 1710000000000, To: 1710003600000},
			requestType: requestType,
		}
		return q.Fingerprint()
	}

	heatmap := fingerprintFor(qbv5.RequestTypeHeatmap)
	timeSeries := fingerprintFor(qbv5.RequestTypeTimeSeries)

	assert.NotEmpty(t, heatmap, "a heatmap decomposes into time buckets like a time series")
	assert.NotEqual(t, timeSeries, heatmap)
	assert.Empty(t, fingerprintFor(qbv5.RequestTypeScalar), "a scalar result is its window's last point")
}

// A series with no `le` has no band to sit in, so an expression that dropped the
// label draws nothing rather than collapsing every sample into one band.
func TestFoldMatrixAsHeatmapDrawsNothingWithoutTheBucketLabel(t *testing.T) {
	matrix := promql.Matrix{
		{
			Metric: labels.FromStrings("service.name", "cart"),
			Floats: []promql.FPoint{{T: 1710000000000, F: 3}},
		},
	}

	data := foldMatrixAsHeatmap(matrix, &qbv5.TimeRange{From: 1710000000000, To: 1710000060000}, uint64(time.Minute.Milliseconds()), "A")

	assert.Equal(t, "A", data.QueryName)
	assert.Empty(t, data.Aggregations)
}

func TestFoldMatrixAsHeatmapAcceptsAnEmptyMatrix(t *testing.T) {
	data := foldMatrixAsHeatmap(promql.Matrix{}, &qbv5.TimeRange{From: 1710000000000, To: 1710000060000}, uint64(time.Minute.Milliseconds()), "A")
	assert.Equal(t, "A", data.QueryName)
	assert.Empty(t, data.Aggregations)
}

func TestFoldMatrixAsHeatmapClampsADecreasingCumulativeCount(t *testing.T) {
	at := int64(1710000000000)

	matrix := promql.Matrix{
		{
			Metric: labels.FromStrings("le", "5"),
			Floats: []promql.FPoint{{T: at, F: 10}},
		},
		{
			Metric: labels.FromStrings("le", "10"),
			Floats: []promql.FPoint{{T: at, F: 4}},
		},
	}

	data := foldMatrixAsHeatmap(matrix, &qbv5.TimeRange{From: 1710000000000, To: 1710000060000}, uint64(time.Minute.Milliseconds()), "A")
	require.Len(t, data.Aggregations, 1)

	// a cumulative count that went backwards would difference to -6
	assert.Equal(t, []float64{10, 0, 0}, data.Aggregations[0].Series[0].Values[0].Values)
}

func TestFoldMatrixAsHeatmapWidensTheBandOverAMissingBoundary(t *testing.T) {
	at := int64(1710000000000)

	matrix := promql.Matrix{
		{
			Metric: labels.FromStrings("le", "5"),
			Floats: []promql.FPoint{{T: at, F: 3}},
		},
		{
			Metric: labels.FromStrings("le", "10"),
			Floats: []promql.FPoint{{T: at, F: math.NaN()}},
		},
		{
			Metric: labels.FromStrings("le", "20"),
			Floats: []promql.FPoint{{T: at, F: 30}},
		},
	}

	data := foldMatrixAsHeatmap(matrix, &qbv5.TimeRange{From: 1710000000000, To: 1710000060000}, uint64(time.Minute.Milliseconds()), "A")
	require.Len(t, data.Aggregations, 1)

	aggregation := data.Aggregations[0]
	// 10 carried nothing to difference against, so it is not on the axis at all
	// and 20 differences against 5, holding what (5,10] and (10,20] would split
	assert.Equal(t, []float64{5, 20}, aggregation.Meta.Buckets)
	assert.Equal(t, []float64{3, 27, 0}, aggregation.Series[0].Values[0].Values)
}

func TestFoldMatrixAsHeatmapHidesInternalLabels(t *testing.T) {
	at := int64(1710000000000)

	matrix := promql.Matrix{
		{
			Metric: labels.FromStrings("__temporality__", "delta", "__resource.host.name", "h1", "service.name", "cart", "le", "5"),
			Floats: []promql.FPoint{{T: at, F: 3}},
		},
	}

	data := foldMatrixAsHeatmap(matrix, &qbv5.TimeRange{From: 1710000000000, To: 1710000060000}, uint64(time.Minute.Milliseconds()), "A")
	require.Len(t, data.Aggregations, 1)
	require.Len(t, data.Aggregations[0].Series, 1)

	series := data.Aggregations[0].Series[0]
	require.Len(t, series.Labels, 1)
	assert.Equal(t, "service.name", series.Labels[0].Key.Name)
}
