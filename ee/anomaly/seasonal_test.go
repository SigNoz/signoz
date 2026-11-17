package anomaly

import (
	"context"
	"log/slog"
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/querier/queriertest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func series(values ...float64) *qbtypes.TimeSeries {
	ts := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "api"}},
	}
	for i, value := range values {
		ts.Values = append(ts.Values, &qbtypes.TimeSeriesValue{Timestamp: int64(i) * 60000, Value: value})
	}
	return ts
}

func partial(ts *qbtypes.TimeSeries) *qbtypes.TimeSeries {
	for _, value := range ts.Values {
		value.Partial = true
	}
	return ts
}

func TestGetAnomalyScores(t *testing.T) {
	provider := &BaseSeasonalProvider{logger: slog.Default()}

	testCases := []struct {
		name    string
		current *qbtypes.TimeSeries
		prev    *qbtypes.TimeSeries
		season  *qbtypes.TimeSeries
		want    float64
	}{
		{
			name:    "SeasonWithSpread_Rise",
			current: series(20),
			prev:    series(5),
			season:  series(4, 6),
			want:    15,
		},
		{
			name:    "FlatSeason_Rise",
			current: series(50),
			prev:    series(5),
			season:  series(5, 5, 5),
			want:    45 / (flatSeasonSpread * 50),
		},
		{
			name:    "FlatSeason_DropKeepsSign",
			current: series(0),
			prev:    series(5),
			season:  series(5, 5, 5),
			want:    -5 / (flatSeasonSpread * 5),
		},
		{
			name:    "FlatSeason_SmallMove",
			current: series(5.1),
			prev:    series(5),
			season:  series(5, 5, 5),
			want:    0.1 / (flatSeasonSpread * 5.1),
		},
		{
			name:    "FlatSeason_NoDeviation",
			current: series(5),
			prev:    series(5),
			season:  series(5, 5, 5),
			want:    0,
		},
		{
			name:    "FlatZeroSeason_NoDeviation",
			current: series(0),
			prev:    series(0),
			season:  series(0, 0, 0),
			want:    0,
		},
		{
			name:    "FlatZeroSeason_RiseIsBounded",
			current: series(4),
			prev:    series(0),
			season:  series(0, 0, 0),
			want:    1 / flatSeasonSpread,
		},
		{
			name:    "FlatFractionalSeason_RoundingNoise",
			current: series(0.1),
			prev:    series(0.1, 0.1),
			season:  series(0.1, 0.1),
			want:    0,
		},
		{
			name:    "FlatFractionalSeason_LongerPrevious",
			current: series(0.7),
			prev:    series(0.7, 0.7, 0.7, 0.7),
			season:  series(0.7, 0.7, 0.7, 0.7),
			want:    0,
		},
		{
			name:    "NoSeason_NotScored",
			current: series(4),
			prev:    nil,
			season:  nil,
			want:    math.NaN(),
		},
		{
			name:    "EmptySeason_NotScored",
			current: series(4),
			prev:    series(5),
			season:  series(),
			want:    math.NaN(),
		},
		{
			name:    "SinglePointSeason_NotScored",
			current: series(50),
			prev:    series(5),
			season:  series(5),
			want:    math.NaN(),
		},
		{
			name:    "FlatSeason_InfiniteValueNotScored",
			current: series(math.Inf(1)),
			prev:    series(5),
			season:  series(5, 5, 5),
			want:    math.NaN(),
		},
		{
			name:    "FlatSeason_NaNValueNotScored",
			current: series(math.NaN()),
			prev:    series(5),
			season:  series(5, 5, 5),
			want:    math.NaN(),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			scores := provider.getAnomalyScores(testCase.current, testCase.prev, testCase.season, testCase.season, testCase.season, testCase.season)
			require.Len(t, scores.Values, 1)
			if math.IsNaN(testCase.want) {
				assert.True(t, math.IsNaN(scores.Values[0].Value))
				return
			}
			assert.InDelta(t, testCase.want, scores.Values[0].Value, 1e-9)
		})
	}
}

func TestGetAnomalyScoresKeepsPartial(t *testing.T) {
	provider := &BaseSeasonalProvider{logger: slog.Default()}
	flat := series(5, 5, 5)

	scores := provider.getAnomalyScores(partial(series(0)), series(5), flat, flat, flat, flat)

	require.Len(t, scores.Values, 1)
	assert.True(t, scores.Values[0].Partial)
	assert.Empty(t, scores.EvaluableValues())
}

func TestGetAnomalies(t *testing.T) {
	target := 3.0
	thresholds := ruletypes.BasicRuleThresholds{{
		Name:            "critical",
		TargetValue:     &target,
		MatchType:       ruletypes.AtleastOnce,
		CompareOperator: ruletypes.ValueIsAbove,
	}}

	testCases := []struct {
		name       string
		current    *qbtypes.TimeSeries
		prev       *qbtypes.TimeSeries
		season     *qbtypes.TimeSeries
		wantAlerts int
	}{
		{
			name:       "SeasonWithSpread_Spike_Fires",
			current:    series(60),
			prev:       series(5),
			season:     series(4, 6),
			wantAlerts: 1,
		},
		{
			name:       "FlatSeason_Spike_Fires",
			current:    series(60),
			prev:       series(5),
			season:     series(5, 5, 5),
			wantAlerts: 1,
		},
		{
			name:       "FlatSeason_NoDeviation_Quiet",
			current:    series(5),
			prev:       series(5),
			season:     series(5, 5, 5),
			wantAlerts: 0,
		},
		{
			name:       "FlatSeason_PartialBucket_Quiet",
			current:    partial(series(60)),
			prev:       series(5),
			season:     series(5, 5, 5),
			wantAlerts: 0,
		},
		{
			name:       "NoSeason_NewSeries_Quiet",
			current:    series(4),
			prev:       nil,
			season:     nil,
			wantAlerts: 0,
		},
		{
			name:       "SinglePointSeason_Quiet",
			current:    series(60),
			prev:       series(5),
			season:     series(5),
			wantAlerts: 0,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			responses := []*qbtypes.TimeSeriesData{
				periodResult(testCase.current),
				periodResult(testCase.prev),
				periodResult(testCase.season),
				periodResult(testCase.season),
				periodResult(testCase.season),
				periodResult(testCase.season),
			}
			var calls int
			mockQuerier := queriertest.NewMockQuerier()
			mockQuerier.QueryRangeFunc = func(_ context.Context, _ valuer.UUID, _ *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
				response := &qbtypes.QueryRangeResponse{Data: qbtypes.QueryData{Results: []any{responses[calls]}}}
				calls++
				return response, nil
			}
			provider := &BaseSeasonalProvider{logger: slog.Default(), querier: mockQuerier}

			resp, err := provider.getAnomalies(context.Background(), valuer.GenerateUUID(), &AnomaliesRequest{
				Params:      &qbtypes.QueryRangeRequest{Start: 1_700_000_000_000, End: 1_700_000_300_000},
				Seasonality: SeasonalityDaily,
			})
			require.NoError(t, err)
			require.Len(t, resp.Results, 1)

			var alerts int
			for _, scores := range resp.Results[0].Aggregations[0].AnomalyScores {
				vector, err := thresholds.Eval(scores, "", ruletypes.EvalData{})
				require.NoError(t, err)
				alerts += len(vector)
			}
			assert.Equal(t, testCase.wantAlerts, alerts)
		})
	}
}

func periodResult(ts *qbtypes.TimeSeries) *qbtypes.TimeSeriesData {
	bucket := &qbtypes.AggregationBucket{}
	if ts != nil {
		bucket.Series = []*qbtypes.TimeSeries{ts}
	}
	return &qbtypes.TimeSeriesData{QueryName: "A", Aggregations: []*qbtypes.AggregationBucket{bucket}}
}
