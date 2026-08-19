package aiobservabilitytypes

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
)

// Per-span costs the SigNoz LLM pricing processor attaches; not OTel semconv.
const (
	SignozGenAICostInput      = "_signoz.gen_ai.cost_input"
	SignozGenAICostOutput     = "_signoz.gen_ai.cost_output"
	SignozGenAICostCacheRead  = "_signoz.gen_ai.cost_cache_read"
	SignozGenAICostCacheWrite = "_signoz.gen_ai.cost_cache_write"
	SignozGenAITotalCost      = "_signoz.gen_ai.total_cost"
)
