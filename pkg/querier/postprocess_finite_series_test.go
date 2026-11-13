package querier

import (
	"context"
	"math"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostProcessResults_NonFiniteSeries(t *testing.T) {
	testCases := []struct {
		name       string
		values     []float64
		wantSeries int
		cutOff     bool
		heatmap    bool
	}{
		{name: "NaN", values: []float64{math.NaN()}, wantSeries: 0},
		{name: "PositiveInfinity", values: []float64{math.Inf(1)}, wantSeries: 0},
		{name: "NegativeInfinity", values: []float64{math.Inf(-1)}, wantSeries: 0},
		{name: "MixedNonFinite", values: []float64{math.NaN(), math.Inf(1), math.Inf(-1)}, wantSeries: 0},
		{name: "Zero", values: []float64{0}, wantSeries: 1},
		{name: "MixedFinite", values: []float64{math.NaN(), 7, math.Inf(1)}, wantSeries: 1},
		{name: "CutOffAll", values: []float64{1, 2}, wantSeries: 0, cutOff: true},
		{name: "CutOffSome", values: []float64{1, 7}, wantSeries: 1, cutOff: true},
		{name: "Heatmap", values: []float64{math.NaN()}, wantSeries: 1, heatmap: true},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			series := &qbtypes.TimeSeries{}
			for index, value := range testCase.values {
				series.Values = append(series.Values, &qbtypes.TimeSeriesValue{Timestamp: int64(index), Value: value, Partial: true})
			}
			finiteSeries := &qbtypes.TimeSeries{Values: []*qbtypes.TimeSeriesValue{{Value: 10}}}
			data := &qbtypes.TimeSeriesData{QueryName: "A", Aggregations: []*qbtypes.AggregationBucket{{Series: []*qbtypes.TimeSeries{series, finiteSeries}}}}
			request := &qbtypes.QueryRangeRequest{
				RequestType:    qbtypes.RequestTypeTimeSeries,
				CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{Type: qbtypes.QueryTypePromQL, Spec: qbtypes.PromQuery{Name: "A"}}}},
			}
			if testCase.cutOff {
				request.CompositeQuery.Queries[0] = qbtypes.QueryEnvelope{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Name: "A", Aggregations: []qbtypes.MetricAggregation{{}},
					Functions: []qbtypes.Function{{Name: qbtypes.FunctionNameCutOffMin, Args: []qbtypes.FunctionArg{{Value: 5.0}}}},
				}}
			}
			if testCase.heatmap {
				request.RequestType = qbtypes.RequestTypeHeatmap
			}
			result, err := (&querier{}).postProcessResults(context.Background(), valuer.UUID{}, map[string]any{"A": data}, request)
			require.NoError(t, err)
			got, ok := result["A"].(*qbtypes.TimeSeriesData)
			require.True(t, ok)
			require.Len(t, got.Aggregations, 1)
			require.Len(t, got.Aggregations[0].Series, testCase.wantSeries+1)
			assert.Contains(t, got.Aggregations[0].Series, finiteSeries)
			if testCase.wantSeries > 0 {
				assert.Contains(t, got.Aggregations[0].Series, series)
			}
		})
	}
}
