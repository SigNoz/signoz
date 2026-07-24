package telemetrytypes

// OpenTelemetry gen_ai semantic-convention attribute keys. Single source of truth
// shared by the AI query builder and the LLM pricing pipeline.
const (
	GenAIRequestModel  = "gen_ai.request.model"
	GenAIResponseModel = "gen_ai.response.model"
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

	// SignozGenAITotalCost is not OTel semconv: it is the per-span total cost the
	// SigNoz LLM pricing processor computes and attaches (see llmpricingruletypes).
	SignozGenAITotalCost = "_signoz.gen_ai.total_cost"
)

// GenAIFieldDefinitions are the gen_ai semantic-convention span attributes the AI
// query builder relies on. They are surfaced by the metadata store for trace
// queries regardless of whether they have been ingested yet, so the AI gate/columns
// resolve on a fresh install (mirrors intrinsic metric keys). String keys are the
// gate; the usage keys are numeric.
var GenAIFieldDefinitions = map[string]TelemetryFieldKey{
	GenAIRequestModel:  {Name: GenAIRequestModel, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
	GenAIResponseModel: {Name: GenAIResponseModel, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
	GenAIOperationName: {Name: GenAIOperationName, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
	GenAIToolName:      {Name: GenAIToolName, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
	GenAIAgentName:     {Name: GenAIAgentName, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
	GenAIProviderName:  {Name: GenAIProviderName, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},

	GenAIUsageInputTokens:              {Name: GenAIUsageInputTokens, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeFloat64},
	GenAIUsageOutputTokens:             {Name: GenAIUsageOutputTokens, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeFloat64},
	GenAIUsageCacheReadInputTokens:     {Name: GenAIUsageCacheReadInputTokens, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeFloat64},
	GenAIUsageCacheCreationInputTokens: {Name: GenAIUsageCacheCreationInputTokens, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeFloat64},
	SignozGenAITotalCost:               {Name: SignozGenAITotalCost, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeFloat64},

	GenAIInputMessages:  {Name: GenAIInputMessages, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
	GenAIOutputMessages: {Name: GenAIOutputMessages, Signal: SignalTraces, FieldContext: FieldContextAttribute, FieldDataType: FieldDataTypeString},
}
