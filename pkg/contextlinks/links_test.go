package contextlinks

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPrepareRuleFilterExpression(t *testing.T) {
	logQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:    "A",
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "severity_text = 'ERROR'"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}},
		},
	}
	hiddenLogQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:     "B",
			Signal:   telemetrytypes.SignalLogs,
			Disabled: true,
			Filter:   &qbtypes.Filter{Expression: "body CONTAINS 'timeout'"},
		},
	}
	unfilteredLogQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:   "C",
			Signal: telemetrytypes.SignalLogs,
		},
	}
	traceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:   "D",
			Signal: telemetrytypes.SignalTraces,
		},
	}
	promQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypePromQL,
		Spec: qbtypes.PromQuery{Name: "E"},
	}
	aiTraceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilderAI,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:    "F",
			Signal:  telemetrytypes.SignalTraces,
			Filter:  &qbtypes.Filter{Expression: "trace.input_tokens > 1000"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "session.id"}}},
		},
	}
	errorRateFormula := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeFormula,
		Spec: qbtypes.QueryBuilderFormula{Name: "F1", Expression: "B / A * 100"},
	}
	unfilteredFormula := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeFormula,
		Spec: qbtypes.QueryBuilderFormula{Name: "F2", Expression: "A / C"},
	}
	brokenFormula := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeFormula,
		Spec: qbtypes.QueryBuilderFormula{Name: "F3", Expression: "A +"},
	}

	testCases := []struct {
		name               string
		condition          *ruletypes.RuleCondition
		signal             telemetrytypes.Signal
		labels             map[string]string
		expectedError      bool
		expectedExpression string
		expectedFound      bool
	}{
		{
			name: "SelectedLogsQuery_AmongMixedQueries",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "A",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{promQuery, logQuery, traceQuery}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "(severity_text='ERROR') AND service.name='checkout'",
			expectedFound:      true,
		},
		{
			name: "SelectedLogsQuery_LeavesOutUnselectedQuery",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "A",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, hiddenLogQuery}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "(severity_text='ERROR') AND service.name='checkout'",
			expectedFound:      true,
		},
		{
			name: "SelectedFormula_MergesHiddenInputsInCompositeQueryOrder",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "F1",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{hiddenLogQuery, logQuery, errorRateFormula}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "((body CONTAINS 'timeout') AND service.name='checkout') OR ((severity_text='ERROR') AND service.name='checkout')",
			expectedFound:      true,
		},
		{
			name: "SelectedFormula_UnfilteredInputMatchesEverything",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "F2",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, unfilteredLogQuery, unfilteredFormula}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{},
			expectedExpression: "",
			expectedFound:      true,
		},
		{
			name: "SelectedFormula_InvalidExpression",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "F3",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, brokenFormula}},
			},
			signal:        telemetrytypes.SignalLogs,
			labels:        map[string]string{},
			expectedError: true,
		},
		{
			name: "NoSelectedQuery_FallsBackToFormula",
			condition: &ruletypes.RuleCondition{
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, hiddenLogQuery, errorRateFormula}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "((severity_text='ERROR') AND service.name='checkout') OR ((body CONTAINS 'timeout') AND service.name='checkout')",
			expectedFound:      true,
		},
		{
			name: "NoSelectedQuery_OnlyHiddenQueries",
			condition: &ruletypes.RuleCondition{
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{hiddenLogQuery}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{},
			expectedExpression: "",
			expectedFound:      false,
		},
		{
			name: "SelectedTracesQuery_WithoutFilter",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "D",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, traceQuery}},
			},
			signal:             telemetrytypes.SignalTraces,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "service.name='checkout'",
			expectedFound:      true,
		},
		{
			name: "SelectedAITraceQuery_CountsAsTraces",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "F",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, aiTraceQuery}},
			},
			signal:             telemetrytypes.SignalTraces,
			labels:             map[string]string{"session.id": "s1"},
			expectedExpression: "(trace.input_tokens>1000) AND session.id='s1'",
			expectedFound:      true,
		},
		{
			name: "SelectedQuery_OfAnotherSignal_LabelsOnly",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "D",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, traceQuery}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "service.name='checkout'",
			expectedFound:      false,
		},
		{
			name: "SelectedQuery_NotABuilderQuery",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "E",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{promQuery}},
			},
			signal:             telemetrytypes.SignalLogs,
			labels:             map[string]string{},
			expectedExpression: "",
			expectedFound:      false,
		},
		{
			name: "UnsupportedSignal_LabelsOnly",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "A",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery}},
			},
			signal:             telemetrytypes.SignalMetrics,
			labels:             map[string]string{"service.name": "checkout"},
			expectedExpression: "service.name='checkout'",
			expectedFound:      false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			expression, found, err := PrepareRuleFilterExpression(testCase.condition, testCase.signal, testCase.labels)
			if testCase.expectedError {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedExpression, expression)
			assert.Equal(t, testCase.expectedFound, found)
		})
	}
}
