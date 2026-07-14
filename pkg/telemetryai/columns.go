package telemetryai

import (
	scopedtraces "github.com/SigNoz/signoz/pkg/telemetryscopedtraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// genAIColumnProvider adds AI/LLM per-trace metrics on top of the common columns.
type genAIColumnProvider struct{}

var _ scopedtraces.ColumnProvider = (*genAIColumnProvider)(nil)

func NewGenAIColumnProvider() scopedtraces.ColumnProvider {
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
		scopedtraces.TraceColumn{Alias: "max_llm_latency_ns", Orderable: true, Expr: scopedtraces.ScopedToKeyColumn(scopedtraces.AggMax, "duration_nano", &reqModel)},
		// errors across the whole trace (any span), so display-only.
		scopedtraces.TraceColumn{Alias: "error_count", Expr: scopedtraces.PredicateCount("has_error = true")},
		// timestamp of the last gen_ai span (LLM/tool/agent), hence gate-scoped.
		scopedtraces.TraceColumn{Alias: "last_activity_time", Orderable: true, Expr: scopedtraces.ScopedReduce(scopedtraces.AggMax, "timestamp")},
		// previews: first call's input (the prompt), last call's output (the answer).
		scopedtraces.TraceColumn{Alias: "input", SpanLevel: true, Expr: scopedtraces.PickBy(&inMsg, str, "timestamp", scopedtraces.PickEarliest)},
		scopedtraces.TraceColumn{Alias: "output", SpanLevel: true, Expr: scopedtraces.PickBy(&outMsg, str, "timestamp", scopedtraces.PickLatest)},
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
