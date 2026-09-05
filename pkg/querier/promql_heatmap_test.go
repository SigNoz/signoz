package querier

import (
	"log/slog"
	"math"
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
