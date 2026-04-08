package rules

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/ee/anomaly"
)

// mockAnomalyProvider is a mock implementation of anomaly.Provider for testing.
// We need this because the anomaly provider makes 6 different queries for various
// time periods (current, past period, current season, past season, past 2 seasons,
// past 3 seasons), making it cumbersome to create mock data.
type mockAnomalyProvider struct {
	responses []*anomaly.AnomaliesResponse
	callCount int
}

func (m *mockAnomalyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *anomaly.AnomaliesRequest) (*anomaly.AnomaliesResponse, error) {
	if m.callCount >= len(m.responses) {
		return &anomaly.AnomaliesResponse{Results: []*qbtypes.TimeSeriesData{}}, nil
	}
	resp := m.responses[m.callCount]
	m.callCount++
	return resp, nil
}

func TestAnomalyRule_NoData_AlertOnAbsent(t *testing.T) {
	// Test basic AlertOnAbsent functionality (without AbsentFor grace period)

	baseTime := time.Unix(1700000000, 0)
	evalWindow := valuer.MustParseTextDuration("5m")
	evalTime := baseTime.Add(5 * time.Minute)

	target := 500.0

	postableRule := ruletypes.PostableRule{
		AlertName: "Test anomaly no data",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeAnomaly,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: evalWindow,
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOperator: ruletypes.ValueIsAbove,
			MatchType:       ruletypes.AtleastOnce,
			Target:          &target,
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
					},
				}},
			},
			SelectedQuery: "A",
			Seasonality:   ruletypes.SeasonalityDaily,
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{
					Name:            "Test anomaly no data",
					TargetValue:     &target,
					MatchType:       ruletypes.AtleastOnce,
					CompareOperator: ruletypes.ValueIsAbove,
				}},
			},
		},
	}

	responseNoData := &anomaly.AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{
			{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{{
					AnomalyScores: []*qbtypes.TimeSeries{},
				}},
			},
		},
	}

	cases := []struct {
		description   string
		alertOnAbsent bool
		expectAlerts  int
	}{
		{
			description:   "AlertOnAbsent=false",
			alertOnAbsent: false,
			expectAlerts:  0,
		},
		{
			description:   "AlertOnAbsent=true",
			alertOnAbsent: true,
			expectAlerts:  1,
		},
	}

	logger := instrumentationtest.New().Logger()

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			postableRule.RuleCondition.AlertOnAbsent = c.alertOnAbsent

			rule, err := NewAnomalyRule(
				"test-anomaly-rule",
				valuer.GenerateUUID(),
				&postableRule,
				nil,
				logger,
			)
			require.NoError(t, err)

			rule.provider = &mockAnomalyProvider{
				responses: []*anomaly.AnomaliesResponse{responseNoData},
			}

			alertsFound, err := rule.Eval(context.Background(), evalTime)
			require.NoError(t, err)
			assert.Equal(t, c.expectAlerts, alertsFound)
		})
	}
}

func TestAnomalyRule_NoData_AbsentFor(t *testing.T) {
	// Test missing data alert with AbsentFor grace period
	// 1. Call Eval with data at time t1, to populate lastTimestampWithDatapoints
	// 2. Call Eval without data at time t2
	// 3. Alert fires only if t2 - t1 > AbsentFor

	baseTime := time.Unix(1700000000, 0)
	evalWindow := valuer.MustParseTextDuration("5m")

	// Set target higher than test data so regular threshold alerts don't fire
	target := 500.0

	postableRule := ruletypes.PostableRule{
		AlertName: "Test anomaly no data with AbsentFor",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeAnomaly,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: evalWindow,
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOperator: ruletypes.ValueIsAbove,
			MatchType:       ruletypes.AtleastOnce,
			AlertOnAbsent:   true,
			Target:          &target,
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
					},
				}},
			},
			SelectedQuery: "A",
			Seasonality:   ruletypes.SeasonalityDaily,
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{
					Name:            "Test anomaly no data with AbsentFor",
					TargetValue:     &target,
					MatchType:       ruletypes.AtleastOnce,
					CompareOperator: ruletypes.ValueIsAbove,
				}},
			},
		},
	}

	responseNoData := &anomaly.AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{
			{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{{
					AnomalyScores: []*qbtypes.TimeSeries{},
				}},
			},
		},
	}

	cases := []struct {
		description        string
		absentFor          uint64
		timeBetweenEvals   time.Duration
		expectAlertOnEval2 int
	}{
		{
			description:        "WithinGracePeriod",
			absentFor:          5,
			timeBetweenEvals:   4 * time.Minute,
			expectAlertOnEval2: 0,
		},
		{
			description:        "AfterGracePeriod",
			absentFor:          5,
			timeBetweenEvals:   6 * time.Minute,
			expectAlertOnEval2: 1,
		},
	}

	logger := instrumentationtest.New().Logger()

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			postableRule.RuleCondition.AbsentFor = c.absentFor

			t1 := baseTime.Add(5 * time.Minute)
			t2 := t1.Add(c.timeBetweenEvals)

			responseWithData := &anomaly.AnomaliesResponse{
				Results: []*qbtypes.TimeSeriesData{
					{
						QueryName: "A",
						Aggregations: []*qbtypes.AggregationBucket{{
							AnomalyScores: []*qbtypes.TimeSeries{
								{
									Labels: []*qbtypes.Label{
										{
											Key:   telemetrytypes.TelemetryFieldKey{Name: "Test"},
											Value: "labels",
										},
									},
									Values: []*qbtypes.TimeSeriesValue{
										{Timestamp: baseTime.UnixMilli(), Value: 1.0},
										{Timestamp: baseTime.Add(time.Minute).UnixMilli(), Value: 1.5},
									},
								},
							},
						}},
					},
				},
			}

			rule, err := NewAnomalyRule("test-anomaly-rule", valuer.GenerateUUID(), &postableRule, nil, logger)
			require.NoError(t, err)

			rule.provider = &mockAnomalyProvider{
				responses: []*anomaly.AnomaliesResponse{responseWithData, responseNoData},
			}

			alertsFound1, err := rule.Eval(context.Background(), t1)
			require.NoError(t, err)
			assert.Equal(t, 0, alertsFound1, "First eval with data should not alert")

			alertsFound2, err := rule.Eval(context.Background(), t2)
			require.NoError(t, err)
			assert.Equal(t, c.expectAlertOnEval2, alertsFound2)
		})
	}
}
