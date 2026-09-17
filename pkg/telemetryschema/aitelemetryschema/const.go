package aitelemetryschema

import (
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	// GenAIFields are the gen_ai span attributes the AI query builder relies on,
	// suggested before ingestion so the filter bar works on a fresh install.
	GenAIFields = map[string]telemetrytypes.TelemetryFieldKey{
		aiobservabilitytypes.GenAIRequestModel:  genAIAttribute(aiobservabilitytypes.GenAIRequestModel, telemetrytypes.FieldDataTypeString),
		aiobservabilitytypes.GenAIOperationName: genAIAttribute(aiobservabilitytypes.GenAIOperationName, telemetrytypes.FieldDataTypeString),
		aiobservabilitytypes.GenAIToolName:      genAIAttribute(aiobservabilitytypes.GenAIToolName, telemetrytypes.FieldDataTypeString),
		aiobservabilitytypes.GenAIAgentName:     genAIAttribute(aiobservabilitytypes.GenAIAgentName, telemetrytypes.FieldDataTypeString),
		aiobservabilitytypes.GenAIProviderName:  genAIAttribute(aiobservabilitytypes.GenAIProviderName, telemetrytypes.FieldDataTypeString),

		aiobservabilitytypes.GenAIUsageInputTokens:              genAIAttribute(aiobservabilitytypes.GenAIUsageInputTokens, telemetrytypes.FieldDataTypeFloat64),
		aiobservabilitytypes.GenAIUsageOutputTokens:             genAIAttribute(aiobservabilitytypes.GenAIUsageOutputTokens, telemetrytypes.FieldDataTypeFloat64),
		aiobservabilitytypes.GenAIUsageCacheReadInputTokens:     genAIAttribute(aiobservabilitytypes.GenAIUsageCacheReadInputTokens, telemetrytypes.FieldDataTypeFloat64),
		aiobservabilitytypes.GenAIUsageCacheCreationInputTokens: genAIAttribute(aiobservabilitytypes.GenAIUsageCacheCreationInputTokens, telemetrytypes.FieldDataTypeFloat64),
		aiobservabilitytypes.GenAIUsageCost:                     genAIAttribute(aiobservabilitytypes.GenAIUsageCost, telemetrytypes.FieldDataTypeFloat64),
		aiobservabilitytypes.SignozGenAITotalCost:               genAIAttribute(aiobservabilitytypes.SignozGenAITotalCost, telemetrytypes.FieldDataTypeFloat64),

		aiobservabilitytypes.GenAIInputMessages:  genAIAttribute(aiobservabilitytypes.GenAIInputMessages, telemetrytypes.FieldDataTypeString),
		aiobservabilitytypes.GenAIOutputMessages: genAIAttribute(aiobservabilitytypes.GenAIOutputMessages, telemetrytypes.FieldDataTypeString),
	}

	// TraceAggregateFields are the per-trace aggregates the AI trace list computes;
	// they are never ingested, so only this definition can surface them.
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

func genAIAttribute(name string, dataType telemetrytypes.FieldDataType) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: dataType,
	}
}

func traceAggregate(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextTrace,
		FieldDataType: telemetrytypes.FieldDataTypeFloat64,
	}
}
