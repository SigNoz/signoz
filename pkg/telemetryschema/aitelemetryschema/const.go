package aitelemetryschema

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// OpenTelemetry gen_ai semantic-convention attribute keys. Single source of truth
// shared by the AI query builder and the LLM pricing pipeline.
const (
	GenAIRequestModel  = "gen_ai.request.model"
	GenAIOperationName = "gen_ai.operation.name"
	GenAIToolName      = "gen_ai.tool.name"
	GenAIAgentName     = "gen_ai.agent.name"
	GenAIProviderName  = "gen_ai.provider.name"

	GenAIUsageInputTokens              = "gen_ai.usage.input_tokens"
	GenAIUsageOutputTokens             = "gen_ai.usage.output_tokens"
	GenAIUsageCacheReadInputTokens     = "gen_ai.usage.cache_read.input_tokens"
	GenAIUsageCacheCreationInputTokens = "gen_ai.usage.cache_creation.input_tokens"

	GenAIInputMessages  = "gen_ai.input.messages"
	GenAIOutputMessages = "gen_ai.output.messages"

	// SignozGenAITotalCost is not OTel semconv: it is the per-span cost the SigNoz
	// LLM pricing processor attaches.
	SignozGenAITotalCost = "_signoz.gen_ai.total_cost"
)

var (
	// GenAIFields are the gen_ai span attributes the AI query builder relies on,
	// suggested before ingestion so the filter bar works on a fresh install.
	GenAIFields = map[string]telemetrytypes.TelemetryFieldKey{
		GenAIRequestModel:  {Name: GenAIRequestModel, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		GenAIOperationName: {Name: GenAIOperationName, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		GenAIToolName:      {Name: GenAIToolName, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		GenAIAgentName:     {Name: GenAIAgentName, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		GenAIProviderName:  {Name: GenAIProviderName, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},

		GenAIUsageInputTokens:              {Name: GenAIUsageInputTokens, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeFloat64},
		GenAIUsageOutputTokens:             {Name: GenAIUsageOutputTokens, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeFloat64},
		GenAIUsageCacheReadInputTokens:     {Name: GenAIUsageCacheReadInputTokens, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeFloat64},
		GenAIUsageCacheCreationInputTokens: {Name: GenAIUsageCacheCreationInputTokens, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeFloat64},
		SignozGenAITotalCost:               {Name: SignozGenAITotalCost, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeFloat64},

		GenAIInputMessages:  {Name: GenAIInputMessages, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		GenAIOutputMessages: {Name: GenAIOutputMessages, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
	}

	// TraceAggregateFields are the per-trace aggregates the AI trace list computes.
	// They are never ingested, so only this definition can surface them; the query
	// builder marks the matching columns filterable.
	TraceAggregateFields = map[string]telemetrytypes.TelemetryFieldKey{
		"llm_call_count":        traceAggregate("llm_call_count"),
		"tool_call_count":       traceAggregate("tool_call_count"),
		"distinct_tool_count":   traceAggregate("distinct_tool_count"),
		"input_tokens":          traceAggregate("input_tokens"),
		"output_tokens":         traceAggregate("output_tokens"),
		"total_tokens":          traceAggregate("total_tokens"),
		"estimated_total_cost":  traceAggregate("estimated_total_cost"),
		"max_llm_duration_nano": traceAggregate("max_llm_duration_nano"),
	}
)

func traceAggregate(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextTrace,
		FieldDataType: telemetrytypes.FieldDataTypeFloat64,
	}
}
