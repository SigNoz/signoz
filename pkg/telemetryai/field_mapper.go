package telemetryai

import (
	"strings"

	scopedtraces "github.com/SigNoz/signoz/pkg/telemetryscopedtraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// genAIBaseConditionProvider: an AI trace has >=1 gen_ai LLM, tool, or agent span.
type genAIBaseConditionProvider struct {
	keys []string
}

var _ scopedtraces.BaseConditionProvider = (*genAIBaseConditionProvider)(nil)

func newGenAIBaseConditionProvider() scopedtraces.BaseConditionProvider {
	return &genAIBaseConditionProvider{
		keys: []string{telemetrytypes.GenAIRequestModel, telemetrytypes.GenAIToolName, telemetrytypes.GenAIAgentName},
	}
}

func (p *genAIBaseConditionProvider) FilterExpression() string {
	parts := make([]string, 0, len(p.keys))
	for _, k := range p.keys {
		parts = append(parts, k+" EXISTS")
	}
	return strings.Join(parts, " OR ")
}

func (p *genAIBaseConditionProvider) FieldKeys() []*telemetrytypes.TelemetryFieldKey {
	keys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(p.keys))
	for _, name := range p.keys {
		keys = append(keys, &telemetrytypes.TelemetryFieldKey{
			Name:         name,
			Signal:       telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextAttribute,
		})
	}
	return keys
}

// genAIColumnProvider adds AI/LLM per-trace metrics on top of the common columns.
type genAIColumnProvider struct{}

var _ scopedtraces.ColumnProvider = (*genAIColumnProvider)(nil)

func newGenAIColumnProvider() scopedtraces.ColumnProvider {
	return &genAIColumnProvider{}
}

func (genAIColumnProvider) Columns() []scopedtraces.TraceColumn {
	defs := telemetrytypes.GenAIFieldDefinitions
	reqModel := defs[telemetrytypes.GenAIRequestModel]
	toolName := defs[telemetrytypes.GenAIToolName]
	inTok := defs[telemetrytypes.GenAIUsageInputTokens]
	outTok := defs[telemetrytypes.GenAIUsageOutputTokens]
	cost := defs[telemetrytypes.SignozGenAITotalCost]
	inMsg := defs[telemetrytypes.GenAIInputMessages]
	outMsg := defs[telemetrytypes.GenAIOutputMessages]

	str := telemetrytypes.FieldDataTypeString
	return append(scopedtraces.CommonTraceColumns(),
		// LLM calls only (request model present), not the full gate.
		scopedtraces.TraceColumn{Alias: "llm_call_count", Orderable: true, Expr: scopedtraces.CountExists(&reqModel)},
		scopedtraces.TraceColumn{Alias: "tool_call_count", Orderable: true, Expr: scopedtraces.CountExists(&toolName)},
		scopedtraces.TraceColumn{Alias: "distinct_tool_count", Orderable: true, Expr: scopedtraces.UniqCount(&toolName, str)},
		// tokens live only on LLM spans, so a plain sum needs no gate scoping.
		scopedtraces.TraceColumn{Alias: "input_tokens", Orderable: true, Expr: scopedtraces.Reduce(scopedtraces.AggSum, &inTok)},
		scopedtraces.TraceColumn{Alias: "output_tokens", Orderable: true, Expr: scopedtraces.Reduce(scopedtraces.AggSum, &outTok)},
		scopedtraces.TraceColumn{Alias: "total_tokens", Orderable: true, Expr: scopedtraces.SumOfKeys(telemetrytypes.FieldDataTypeFloat64, &inTok, &outTok)},
		// per-span cost attached by the SigNoz LLM pricing processor.
		scopedtraces.TraceColumn{Alias: "estimated_cost_usd", Orderable: true, Expr: scopedtraces.Reduce(scopedtraces.AggSum, &cost)},
		// slowest single LLM call in the trace.
		scopedtraces.TraceColumn{Alias: "max_llm_latency_ns", Orderable: true, Expr: scopedtraces.ScopedToKeyColumn(scopedtraces.AggMax, scopedtraces.IntrinsicSpanKey("duration_nano"), &reqModel)},
		// errors across the whole trace (any span), so display-only.
		scopedtraces.TraceColumn{Alias: "error_count", Expr: scopedtraces.CondCount(scopedtraces.IntrinsicSpanKey("has_error"), qbtypes.FilterOperatorEqual, true)},
		// timestamp of the last gen_ai span (LLM/tool/agent), hence gate-scoped.
		scopedtraces.TraceColumn{Alias: "last_activity_time", Orderable: true, Expr: scopedtraces.ScopedReduce(scopedtraces.AggMax, scopedtraces.IntrinsicSpanKey("timestamp"))},
		// previews: first call's input (the prompt), last call's output (the answer).
		scopedtraces.TraceColumn{Alias: "input", SpanLevel: true, Expr: scopedtraces.PickBy(&inMsg, str, scopedtraces.IntrinsicSpanKey("timestamp"), scopedtraces.PickEarliest)},
		scopedtraces.TraceColumn{Alias: "output", SpanLevel: true, Expr: scopedtraces.PickBy(&outMsg, str, scopedtraces.IntrinsicSpanKey("timestamp"), scopedtraces.PickLatest)},
	)
}

func (genAIColumnProvider) DefaultOrderAlias() string { return "last_activity_time" }

func (p genAIColumnProvider) AggregateAliases() []string {
	// Derived from Columns() so a new column can't be forgotten; SpanLevel columns
	// are filtered span-level, so skip them.
	cols := p.Columns()
	aliases := make([]string, 0, len(cols))
	for _, c := range cols {
		if !c.SpanLevel {
			aliases = append(aliases, c.Alias)
		}
	}
	return aliases
}
