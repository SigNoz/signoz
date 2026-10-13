package contextlinks

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestExtractBuilderQueries(t *testing.T) {
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
	traceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:   "C",
			Signal: telemetrytypes.SignalTraces,
		},
	}
	promQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypePromQL,
		Spec: qbtypes.PromQuery{Name: "D"},
	}
	aiTraceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilderAI,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:    "E",
			Signal:  telemetrytypes.SignalTraces,
			Filter:  &qbtypes.Filter{Expression: "trace.input_tokens > 1000"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "session.id"}}},
		},
	}
	formula := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeFormula,
		Spec: qbtypes.QueryBuilderFormula{Name: "F1", Expression: "B / A * 100"},
	}

	testCases := []struct {
		name                   string
		condition              *ruletypes.RuleCondition
		signal                 telemetrytypes.Signal
		expectedBuilderQueries []BuilderQuery
	}{
		{
			name: "SelectedLogsQuery_AmongMixedQueries",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "A",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{promQuery, logQuery, traceQuery}},
			},
			signal: telemetrytypes.SignalLogs,
			expectedBuilderQueries: []BuilderQuery{
				{Name: "A", Filter: "severity_text = 'ERROR'", GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}}},
			},
		},
		{
			name: "SelectedLogsQuery_LeavesOutUnselectedQuery",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "A",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, hiddenLogQuery}},
			},
			signal: telemetrytypes.SignalLogs,
			expectedBuilderQueries: []BuilderQuery{
				{Name: "A", Filter: "severity_text = 'ERROR'", GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}}},
			},
		},
		{
			name: "SelectedFormula_HiddenInputsInCompositeQueryOrder",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "F1",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{hiddenLogQuery, logQuery, formula}},
			},
			signal: telemetrytypes.SignalLogs,
			expectedBuilderQueries: []BuilderQuery{
				{Name: "B", Filter: "body CONTAINS 'timeout'"},
				{Name: "A", Filter: "severity_text = 'ERROR'", GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}}},
			},
		},
		{
			name: "NoSelectedQuery_FallsBackToFormula",
			condition: &ruletypes.RuleCondition{
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, hiddenLogQuery, formula}},
			},
			signal: telemetrytypes.SignalLogs,
			expectedBuilderQueries: []BuilderQuery{
				{Name: "A", Filter: "severity_text = 'ERROR'", GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}}},
				{Name: "B", Filter: "body CONTAINS 'timeout'"},
			},
		},
		{
			name: "SelectedTracesQuery_WithoutFilter",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "C",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, traceQuery}},
			},
			signal:                 telemetrytypes.SignalTraces,
			expectedBuilderQueries: []BuilderQuery{{Name: "C"}},
		},
		{
			name: "SelectedAITraceQuery_CountsAsTraces",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "E",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, aiTraceQuery}},
			},
			signal: telemetrytypes.SignalTraces,
			expectedBuilderQueries: []BuilderQuery{
				{Name: "E", Filter: "trace.input_tokens > 1000", GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "session.id"}}}},
			},
		},
		{
			name: "SelectedQuery_OfAnotherSignal",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "C",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery, traceQuery}},
			},
			signal: telemetrytypes.SignalLogs,
		},
		{
			name: "SelectedQuery_NotABuilderQuery",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "D",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{promQuery}},
			},
			signal: telemetrytypes.SignalLogs,
		},
		{
			name: "UnsupportedSignal",
			condition: &ruletypes.RuleCondition{
				SelectedQuery:  "A",
				CompositeQuery: &ruletypes.AlertCompositeQuery{Queries: []qbtypes.QueryEnvelope{logQuery}},
			},
			signal: telemetrytypes.SignalMetrics,
		},
		{
			name:      "NoCompositeQuery",
			condition: &ruletypes.RuleCondition{SelectedQuery: "A"},
			signal:    telemetrytypes.SignalLogs,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expectedBuilderQueries, ExtractBuilderQueries(testCase.condition, testCase.signal))
		})
	}
}
