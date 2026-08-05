package aistatementbuilder

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	scopedtraces "github.com/SigNoz/signoz/pkg/statementbuilder/scopedtracesstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns the provider factory for builder_ai_query: the gen_ai Scope
// paired with the domain-neutral scoped-trace builder.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.TraceAggregation], statementbuilder.Config] {
	return scopedtraces.NewFactory(factory.MustNewName("ai"), Scope(), telemetryStore, metadataStore, fl)
}

// Scope describes gen_ai for the scoped trace builder: an AI trace has >=1 gen_ai
// LLM, tool, or agent span, and its list adds AI/LLM per-trace metrics.
func Scope() scopedtraces.TraceScope {
	gateKeyNames := []string{telemetrytypes.GenAIRequestModel, telemetrytypes.GenAIToolName, telemetrytypes.GenAIAgentName}
	gateExprs := make([]string, 0, len(gateKeyNames))
	gateKeys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(gateKeyNames))
	for _, name := range gateKeyNames {
		gateExprs = append(gateExprs, name+" EXISTS")
		gateKeys = append(gateKeys, &telemetrytypes.TelemetryFieldKey{
			Name:         name,
			Signal:       telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextAttribute,
		})
	}

	defs := telemetrytypes.GenAIFieldDefinitions
	reqModel := defs[telemetrytypes.GenAIRequestModel]
	toolName := defs[telemetrytypes.GenAIToolName]
	inTok := defs[telemetrytypes.GenAIUsageInputTokens]
	outTok := defs[telemetrytypes.GenAIUsageOutputTokens]
	cost := defs[telemetrytypes.SignozGenAITotalCost]
	inMsg := defs[telemetrytypes.GenAIInputMessages]
	outMsg := defs[telemetrytypes.GenAIOutputMessages]

	str := telemetrytypes.FieldDataTypeString
	columns := append(scopedtraces.CommonTraceColumns(),
		// LLM calls only (request model present), not the full gate.
		scopedtraces.TraceColumn{Alias: "llm_call_count", Orderable: true, Filterable: true, Expr: scopedtraces.CountExists(&reqModel)},
		scopedtraces.TraceColumn{Alias: "tool_call_count", Orderable: true, Filterable: true, Expr: scopedtraces.CountExists(&toolName)},
		scopedtraces.TraceColumn{Alias: "distinct_tool_count", Orderable: true, Filterable: true, Expr: scopedtraces.UniqCount(&toolName, str)},
		// tokens live only on LLM spans, so a plain sum needs no gate scoping.
		scopedtraces.TraceColumn{Alias: "input_tokens", Orderable: true, Filterable: true, Expr: scopedtraces.Reduce(scopedtraces.AggSum, &inTok)},
		scopedtraces.TraceColumn{Alias: "output_tokens", Orderable: true, Filterable: true, Expr: scopedtraces.Reduce(scopedtraces.AggSum, &outTok)},
		scopedtraces.TraceColumn{Alias: "total_tokens", Orderable: true, Filterable: true, Expr: scopedtraces.SumOfKeys(telemetrytypes.FieldDataTypeFloat64, &inTok, &outTok)},
		// per-span cost attached by the SigNoz LLM pricing processor.
		scopedtraces.TraceColumn{Alias: "estimated_total_cost", Orderable: true, Filterable: true, Expr: scopedtraces.Reduce(scopedtraces.AggSum, &cost)},
		// slowest single LLM call in the trace.
		scopedtraces.TraceColumn{Alias: "max_llm_duration_nano", Orderable: true, Filterable: true, Expr: scopedtraces.ScopedToKeyColumn(scopedtraces.AggMax, scopedtraces.IntrinsicSpanKey("duration_nano"), &reqModel)},
		// errors across the whole trace (any span), so display-only.
		scopedtraces.TraceColumn{Alias: "error_count", Expr: scopedtraces.CondCount(scopedtraces.IntrinsicSpanKey("has_error"), qbtypes.FilterOperatorEqual, true)},
		// timestamp of the last gen_ai span (LLM/tool/agent), hence gate-scoped;
		// order-only: a raw-nanos threshold makes no sense in the filter bar.
		scopedtraces.TraceColumn{Alias: "last_activity_time", Orderable: true, Expr: scopedtraces.ScopedReduce(scopedtraces.AggMax, scopedtraces.IntrinsicSpanKey("timestamp"))},
		// previews: first call's input (the prompt), last call's output (the answer).
		scopedtraces.TraceColumn{Alias: "input", SpanLevel: true, Expr: scopedtraces.PickBy(&inMsg, str, scopedtraces.IntrinsicSpanKey("timestamp"), scopedtraces.PickEarliest)},
		scopedtraces.TraceColumn{Alias: "output", SpanLevel: true, Expr: scopedtraces.PickBy(&outMsg, str, scopedtraces.IntrinsicSpanKey("timestamp"), scopedtraces.PickLatest)},
	)

	return scopedtraces.TraceScope{
		FilterExpression:  strings.Join(gateExprs, " OR "),
		FieldKeys:         gateKeys,
		Columns:           columns,
		DefaultOrderAlias: "last_activity_time",
	}
}

// TraceAggregateFieldKeys returns the filterable+orderable aggregates as trace-context
// keys for builder_ai_query suggestions; order-only columns would be rejected in filters.
func TraceAggregateFieldKeys() []*telemetrytypes.TelemetryFieldKey {
	cols := Scope().Columns
	keys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(cols))
	for _, c := range cols {
		if !c.Orderable || !c.Filterable {
			continue
		}
		keys = append(keys, &telemetrytypes.TelemetryFieldKey{
			Name:          c.Alias,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextTrace,
			FieldDataType: telemetrytypes.FieldDataTypeFloat64,
		})
	}
	return keys
}
