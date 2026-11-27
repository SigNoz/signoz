package rules

import (
	"context"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func scalarPanelRule(alertType ruletypes.AlertType, panelType ruletypes.PanelType, query qbtypes.QueryEnvelope, target float64, matchType ruletypes.MatchType) ruletypes.PostableRule {
	return ruletypes.PostableRule{
		AlertName: valuer.NewDisplayName("Scalar panel test"),
		AlertType: alertType,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypeBuilder,
				PanelType: panelType,
				Queries:   []qbtypes.QueryEnvelope{query},
			},
			SelectedQuery: "A",
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{
					Name:            "critical",
					TargetValue:     &target,
					MatchType:       matchType,
					CompareOperator: ruletypes.ValueIsAbove,
				}},
			},
		},
	}
}

// A value panel reduces the window to one number (reduceTo), so a target no
// single step crosses fires on the reduced value and matchType, which is
// about steps, no longer matters. The same rows on a graph panel keep the
// step semantics.
func TestThresholdRuleEvalScalarPanelTypeMetricsReducedOverWindow(t *testing.T) {
	ts := time.Now().Truncate(time.Minute)
	query := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name:         "A",
			Signal:       telemetrytypes.SignalMetrics,
			StepInterval: qbtypes.Step{Duration: time.Minute},
			Aggregations: []qbtypes.MetricAggregation{{
				MetricName:       "signoz_calls_total",
				Temporality:      metrictypes.Delta,
				TimeAggregation:  metrictypes.TimeAggregationRate,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
				ReduceTo:         qbtypes.ReduceToSum,
			}},
		},
	}
	cols := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "value", Type: "Float64"},
	}
	values := [][]any{
		{ts.Add(-4 * time.Minute), float64(100)},
		{ts.Add(-3 * time.Minute), float64(150)},
		{ts.Add(-2 * time.Minute), float64(250)},
	}

	testCases := []struct {
		name               string
		panelType          ruletypes.PanelType
		matchType          ruletypes.MatchType
		target             float64
		expectedAlertCount int
	}{
		{name: "ValuePanel_SumAboveTarget_AllTheTimes_Fires", panelType: ruletypes.PanelTypeValue, matchType: ruletypes.AllTheTimes, target: 400, expectedAlertCount: 1},
		{name: "ValuePanel_SumBelowTarget_AtleastOnce_Silent", panelType: ruletypes.PanelTypeValue, matchType: ruletypes.AtleastOnce, target: 600, expectedAlertCount: 0},
		{name: "GraphPanel_NoStepAboveTarget_AllTheTimes_Silent", panelType: ruletypes.PanelTypeGraph, matchType: ruletypes.AllTheTimes, target: 400, expectedAlertCount: 0},
		{name: "GraphPanel_OneStepAboveTarget_AtleastOnce_Fires", panelType: ruletypes.PanelTypeGraph, matchType: ruletypes.AtleastOnce, target: 200, expectedAlertCount: 1},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
			telemetryStore.Mock().
				ExpectQuery("SELECT any").
				WithArgs(nil, nil, nil, nil, nil, nil, nil).
				WillReturnRows(cmock.NewRows(cols, values))
			querier, mockMetadataStore := prepareQuerierForMetrics(t, telemetryStore)
			mockMetadataStore.TypeMap["signoz_calls_total"] = metrictypes.SumType

			postableRule := scalarPanelRule(ruletypes.AlertTypeMetric, testCase.panelType, query, testCase.target, testCase.matchType)
			rule, err := NewThresholdRule("scalar", valuer.GenerateUUID(), &postableRule, querier, instrumentationtest.New().Logger(), mustParseURL(t, "http://localhost:8080"))
			require.NoError(t, err)

			alertsFound, err := rule.Eval(context.Background(), ts)
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedAlertCount, alertsFound)
		})
	}
}

// A table panel over logs yields one row per group for the whole window, and
// the engine raises one alert per row that crosses the target, labelled with
// the group values.
func TestThresholdRuleEvalScalarPanelTypeLogsOneAlertPerRow(t *testing.T) {
	ts := time.Now().Truncate(time.Minute)
	serviceKey := telemetrytypes.TelemetryFieldKey{
		Name:          "service.name",
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	query := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:         "A",
			Signal:       telemetrytypes.SignalLogs,
			StepInterval: qbtypes.Step{Duration: time.Minute},
			Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
			GroupBy:      []qbtypes.GroupByKey{{TelemetryFieldKey: serviceKey}},
		},
	}
	keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{"service.name": {&serviceKey}}
	cols := []cmock.ColumnType{
		{Name: "__GROUP_BY_KEY_0_service.name", Type: "String"},
		{Name: "__result_0", Type: "UInt64"},
	}

	testCases := []struct {
		name               string
		rows               [][]any
		alertOnAbsent      bool
		expectedAlertCount int
		expectedServices   []string
		expectedMissing    bool
	}{
		{
			name:               "TwoGroups_OneAboveTarget_FiresForThatGroup",
			rows:               [][]any{{"checkout", uint64(120)}, {"cart", uint64(30)}},
			expectedAlertCount: 1,
			expectedServices:   []string{"checkout"},
		},
		{
			name:               "TwoGroups_BothAboveTarget_FiresForEach",
			rows:               [][]any{{"checkout", uint64(120)}, {"cart", uint64(130)}},
			expectedAlertCount: 2,
			expectedServices:   []string{"cart", "checkout"},
		},
		{
			name:               "NoRows_AlertOnAbsent_FiresNoData",
			rows:               [][]any{},
			alertOnAbsent:      true,
			expectedAlertCount: 1,
			expectedMissing:    true,
		},
		{
			name:               "NoRows_WithoutAlertOnAbsent_Silent",
			rows:               [][]any{},
			expectedAlertCount: 0,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
			telemetryStore.Mock().
				ExpectQuery("SELECT any").
				WithArgs(nil, nil, nil, nil).
				WillReturnRows(cmock.NewRows(cols, testCase.rows))
			querier := prepareQuerierForLogs(t, telemetryStore, keysMap)

			postableRule := scalarPanelRule(ruletypes.AlertTypeLogs, ruletypes.PanelTypeTable, query, 100, ruletypes.OnAverage)
			postableRule.RuleCondition.AlertOnAbsent = testCase.alertOnAbsent
			rule, err := NewThresholdRule("scalar", valuer.GenerateUUID(), &postableRule, querier, instrumentationtest.New().Logger(), mustParseURL(t, "http://localhost:8080"))
			require.NoError(t, err)

			alertsFound, err := rule.Eval(context.Background(), ts)
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedAlertCount, alertsFound)

			services := make([]string, 0, len(rule.Active))
			for _, alert := range rule.Active {
				assert.Equal(t, testCase.expectedMissing, alert.Missing)
				if service := alert.QueryResultLabels.Get("service.name"); service != "" {
					services = append(services, service)
				}
			}
			assert.ElementsMatch(t, testCase.expectedServices, services)
		})
	}
}
