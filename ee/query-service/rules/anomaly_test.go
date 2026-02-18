package rules

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/ee/query-service/anomaly"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// mockAnomalyProvider is a mock implementation of anomaly.Provider for testing.
// We need this because the anomaly provider makes 6 different queries for various
// time periods (current, past period, current season, past season, past 2 seasons,
// past 3 seasons), making it cumbersome to create mock data.
type mockAnomalyProvider struct {
	responses []*anomaly.GetAnomaliesResponse
	callCount int
}

func (m *mockAnomalyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *anomaly.GetAnomaliesRequest) (*anomaly.GetAnomaliesResponse, error) {
	if m.callCount >= len(m.responses) {
		return &anomaly.GetAnomaliesResponse{Results: []*v3.Result{}}, nil
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
		RuleType:  RuleTypeAnomaly,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: evalWindow,
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOp: ruletypes.ValueIsAbove,
			MatchType: ruletypes.AtleastOnce,
			Target:    &target,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:   "A",
						Expression:  "A",
						DataSource:  v3.DataSourceMetrics,
						Temporality: v3.Unspecified,
					},
				},
			},
			SelectedQuery: "A",
			Seasonality:   "daily",
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{
					Name:        "Test anomaly no data",
					TargetValue: &target,
					MatchType:   ruletypes.AtleastOnce,
					CompareOp:   ruletypes.ValueIsAbove,
				}},
			},
		},
	}

	responseNoData := &anomaly.GetAnomaliesResponse{
		Results: []*v3.Result{
			{
				QueryName:     "A",
				AnomalyScores: []*v3.Series{},
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

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, nil)
			options := clickhouseReader.NewOptions("primaryNamespace")
			reader := clickhouseReader.NewReader(nil, telemetryStore, nil, "", time.Second, nil, nil, options)

			rule, err := NewAnomalyRule(
				"test-anomaly-rule",
				valuer.GenerateUUID(),
				&postableRule,
				reader,
				nil,
				logger,
				nil,
			)
			require.NoError(t, err)

			rule.provider = &mockAnomalyProvider{
				responses: []*anomaly.GetAnomaliesResponse{responseNoData},
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
		RuleType:  RuleTypeAnomaly,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: evalWindow,
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOp:     ruletypes.ValueIsAbove,
			MatchType:     ruletypes.AtleastOnce,
			AlertOnAbsent: true,
			Target:        &target,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:   "A",
						Expression:  "A",
						DataSource:  v3.DataSourceMetrics,
						Temporality: v3.Unspecified,
					},
				},
			},
			SelectedQuery: "A",
			Seasonality:   "daily",
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{
					Name:        "Test anomaly no data with AbsentFor",
					TargetValue: &target,
					MatchType:   ruletypes.AtleastOnce,
					CompareOp:   ruletypes.ValueIsAbove,
				}},
			},
		},
	}

	responseNoData := &anomaly.GetAnomaliesResponse{
		Results: []*v3.Result{
			{
				QueryName:     "A",
				AnomalyScores: []*v3.Series{},
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

			responseWithData := &anomaly.GetAnomaliesResponse{
				Results: []*v3.Result{
					{
						QueryName: "A",
						AnomalyScores: []*v3.Series{
							{
								Labels: map[string]string{"test": "label"},
								Points: []v3.Point{
									{Timestamp: baseTime.UnixMilli(), Value: 1.0},
									{Timestamp: baseTime.Add(time.Minute).UnixMilli(), Value: 1.5},
								},
							},
						},
					},
				},
			}

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, nil)
			options := clickhouseReader.NewOptions("primaryNamespace")
			reader := clickhouseReader.NewReader(nil, telemetryStore, nil, "", time.Second, nil, nil, options)

			rule, err := NewAnomalyRule("test-anomaly-rule", valuer.GenerateUUID(), &postableRule, reader, nil, logger, nil)
			require.NoError(t, err)

			rule.provider = &mockAnomalyProvider{
				responses: []*anomaly.GetAnomaliesResponse{responseWithData, responseNoData},
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
