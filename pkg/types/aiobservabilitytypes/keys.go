package aiobservabilitytypes

import "strings"

// OpenTelemetry gen_ai semantic-convention attribute keys. Single source of truth
// shared by the AI query builder and the LLM pricing pipeline.
const (
	GenAIRequestModel  = "gen_ai.request.model"
	GenAIOperationName = "gen_ai.operation.name"
	GenAIToolName      = "gen_ai.tool.name"
	GenAIAgentName     = "gen_ai.agent.name"
	GenAIProviderName  = "gen_ai.provider.name"
	GenAISystem        = "gen_ai.system" // Legacy OTel draft semconv

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

// GenAISpanGateKeys mark a span as gen_ai: an LLM call, a tool call, or an
// agent span. A trace belongs to the AI explorer when any span carries one.
var GenAISpanGateKeys = []string{GenAIRequestModel, GenAIToolName, GenAIAgentName}

// GenAISpanFilterExpression renders the gate as a query-builder filter
// expression: each gate key ORed on EXISTS.
func GenAISpanFilterExpression() string {
	exprs := make([]string, 0, len(GenAISpanGateKeys))
	for _, key := range GenAISpanGateKeys {
		exprs = append(exprs, key+" EXISTS")
	}
	return strings.Join(exprs, " OR ")
}
