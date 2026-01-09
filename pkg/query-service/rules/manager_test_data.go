package rules

import (
	"math"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// ThresholdRuleTestCase defines test case structure for threshold rule test notifications
type ThresholdRuleTestCase struct {
	Name         string
	Values       [][]interface{}
	ExpectAlerts int
	ExpectValue  float64
}

// PromRuleTestValue represents a single value point in a PromQL rule test case
type PromRuleTestValue struct {
	Offset time.Duration // offset from baseTime (negative = in the past)
	Value  float64
}

// PromRuleTestCase defines test case structure for PromQL rule test notifications
type PromRuleTestCase struct {
	Name         string
	Values       []PromRuleTestValue
	ExpectAlerts int
	ExpectValue  float64
}

// ThresholdRuleAtLeastOnceValueAbove creates a PostableRule for threshold rule test notifications
func ThresholdRuleAtLeastOnceValueAbove(target float64, recovery *float64) ruletypes.PostableRule {
	return ruletypes.PostableRule{
		AlertName: "test-alert",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		Labels: map[string]string{
			"service.name": "frontend",
		},
		Annotations: map[string]string{
			"value": "{{$value}}",
		},
		Version: "v5",
		RuleCondition: &ruletypes.RuleCondition{
			MatchType: ruletypes.AtleastOnce,
			CompareOp: ruletypes.ValueIsAbove,
			Target:    &target,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,

							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "probe_success",
									TimeAggregation:  metrictypes.TimeAggregationAvg,
									SpaceAggregation: metrictypes.SpaceAggregationAvg,
								},
							},
						},
					},
				},
			},
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{
					{
						Name:           "primary",
						TargetValue:    &target,
						RecoveryTarget: recovery,
						MatchType:      ruletypes.AtleastOnce,
						CompareOp:      ruletypes.ValueIsAbove,
					},
				},
			},
		},
		NotificationSettings: &ruletypes.NotificationSettings{},
	}
}

// BuildPromAtLeastOnceValueAbove creates a PostableRule for PromQL rule test notifications
func BuildPromAtLeastOnceValueAbove(target float64, recovery *float64) ruletypes.PostableRule {
	return ruletypes.PostableRule{
		AlertName: "test-prom-alert",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		Labels: map[string]string{
			"service.name": "frontend",
		},
		Annotations: map[string]string{
			"value": "{{$value}}",
		},
		Version: "v5",
		RuleCondition: &ruletypes.RuleCondition{
			MatchType:     ruletypes.AtleastOnce,
			SelectedQuery: "A",
			CompareOp:     ruletypes.ValueIsAbove,
			Target:        &target,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PanelType: v3.PanelTypeGraph,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:     "A",
							Query:    "{\"test_metric\"}",
							Disabled: false,
							Stats:    false,
						},
					},
				},
			},
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{
					{
						Name:           "primary",
						TargetValue:    &target,
						RecoveryTarget: recovery,
						MatchType:      ruletypes.AtleastOnce,
						CompareOp:      ruletypes.ValueIsAbove,
						Channels:       []string{"slack"},
					},
				},
			},
		},
		NotificationSettings: &ruletypes.NotificationSettings{},
	}
}

var (
	// TcTestNotiSendUnmatchedThresholdRule contains test cases for threshold rule test notifications
	TcTestNotiSendUnmatchedThresholdRule = []ThresholdRuleTestCase{
		{
			Name: "return first valid point in case of test notification",
			Values: [][]interface{}{
				{float64(3), "attr", time.Now()},
				{float64(4), "attr", time.Now().Add(1 * time.Minute)},
			},
			ExpectAlerts: 1,
			ExpectValue:  3,
		},
		{
			Name:         "No data in DB so no alerts fired",
			Values:       [][]interface{}{},
			ExpectAlerts: 0,
		},
		{
			Name: "return first valid point in case of test notification skips NaN and Inf",
			Values: [][]interface{}{
				{math.NaN(), "attr", time.Now()},
				{math.Inf(1), "attr", time.Now().Add(1 * time.Minute)},
				{float64(7), "attr", time.Now().Add(2 * time.Minute)},
			},
			ExpectAlerts: 1,
			ExpectValue:  7,
		},
		{
			Name: "If found matching alert with given target value, return the alerting value rather than first valid point",
			Values: [][]interface{}{
				{float64(1), "attr", time.Now()},
				{float64(2), "attr", time.Now().Add(1 * time.Minute)},
				{float64(3), "attr", time.Now().Add(2 * time.Minute)},
				{float64(12), "attr", time.Now().Add(3 * time.Minute)},
			},
			ExpectAlerts: 1,
			ExpectValue:  12,
		},
	}

	// TcTestNotificationSendUnmatchedPromRule contains test cases for PromQL rule test notifications
	TcTestNotificationSendUnmatchedPromRule = []PromRuleTestCase{
		{
			Name: "return first valid point in case of test notification",
			Values: []PromRuleTestValue{
				{Offset: -4 * time.Minute, Value: 3},
				{Offset: -3 * time.Minute, Value: 4},
			},
			ExpectAlerts: 1,
			ExpectValue:  3,
		},
		{
			Name:         "No data in DB so no alerts fired",
			Values:       []PromRuleTestValue{},
			ExpectAlerts: 0,
		},
		{
			Name: "return first valid point in case of test notification skips NaN and Inf",
			Values: []PromRuleTestValue{
				{Offset: -4 * time.Minute, Value: math.NaN()},
				{Offset: -3 * time.Minute, Value: math.Inf(1)},
				{Offset: -2 * time.Minute, Value: 7},
			},
			ExpectAlerts: 1,
			ExpectValue:  7,
		},
		{
			Name: "If found matching alert with given target value, return the alerting value rather than first valid point",
			Values: []PromRuleTestValue{
				{Offset: -4 * time.Minute, Value: 1},
				{Offset: -3 * time.Minute, Value: 2},
				{Offset: -2 * time.Minute, Value: 3},
				{Offset: -1 * time.Minute, Value: 12},
			},
			ExpectAlerts: 1,
			ExpectValue:  12,
		},
	}
)
