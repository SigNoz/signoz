# Shipped span mapper definitions

Where each source key comes from. Bump `version` on every change.

## gen_ai.llm

Condition: `model`, `llm.input_messages` (OpenInference sets `llm.model_name` from the response, so a failed call has no model key).

| Source | Emitted by |
|---|---|
| `llm.model_name`, `llm.provider`, `llm.system`, `llm.token_count.prompt`, `llm.token_count.completion`, `llm.token_count.prompt_details.cache_read`, `llm.token_count.prompt_details.cache_write`, `llm.token_count.completion_details.reasoning`, `llm.finish_reason`, `input.value`, `output.value`, `embedding.model_name`, `reranker.model_name`, `openinference.span.kind` | OpenInference |
| `llm.request.model`, `llm.response.model`, `llm.vendor`, `llm.usage.prompt_tokens`, `llm.usage.completion_tokens`, `llm.response.finish_reason`, `llm.response.stop_reason` | OpenLLMetry before the `gen_ai` rename |
| `gen_ai.system`, `gen_ai.usage.prompt_tokens`, `gen_ai.usage.completion_tokens`, `gen_ai.usage.cache_read_input_tokens`, `gen_ai.usage.cache_creation_input_tokens`, `gen_ai.usage.reasoning_tokens`, `gen_ai.prompt`, `gen_ai.completion`, `llm.request.type`, `traceloop.span.kind` | OpenLLMetry, LiteLLM, CrewAI, Mistral, LangSmith, OpenRouter gateway |
| `gen_ai.usage.cache_write.input_tokens` | OTel semconv draft spelling |
| `gen_ai.response.finish_reason`, `gen_ai.usage.prompt_token_details.cached_read_tokens`, `gen_ai.usage.completion_token_details.reasoning_tokens` | Bifrost gateway |
| `gen_ai.usage.input_tokens.cached` | OpenRouter gateway |
| `ai.model.id`, `ai.model.provider`, `ai.response.model`, `ai.response.finishReason`, `ai.prompt.messages`, `ai.response.text`, `ai.response.toolCalls`, `ai.usage.promptTokens`, `ai.usage.completionTokens` | Vercel AI SDK v4, Mastra |
| `ai.usage.inputTokens`, `ai.usage.outputTokens`, `ai.usage.cachedInputTokens`, `ai.usage.reasoningTokens` | Vercel AI SDK v5 |
| `langfuse.observation.model.name`, `langfuse.session.id` | Langfuse SDK v3 |
| `session.id` | OpenInference, Langfuse, Claude Code |
| `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens` | Claude Code `claude_code.llm_request` spans ([docs](https://code.claude.com/docs/en/monitoring-usage#span-attributes)) |

## gen_ai.tool

Condition: `tool.name` (OpenInference), `ai.toolCall.` (Vercel, Mastra), `tool_call_args`, `tool_response` (Google ADK), `tool_name` (Claude Code).

| Source | Emitted by |
|---|---|
| `tool.name`, `tool.id`, `tool.description`, `input.value`, `output.value`, `openinference.span.kind` | OpenInference |
| `ai.toolCall.name`, `ai.toolCall.id`, `ai.toolCall.args`, `ai.toolCall.result` | Vercel AI SDK, Mastra |
| `traceloop.entity.input`, `traceloop.entity.output`, `traceloop.span.kind`, `llm.request.type` | OpenLLMetry |
| `gcp.vertex.agent.tool_call_args`, `gcp.vertex.agent.tool_response` | Google ADK |
| `tool_name` | Claude Code `claude_code.tool` spans |

## gen_ai.agent

Condition: `agent`.

| Source | Emitted by |
|---|---|
| `agent.name`, `agent.id`, `agent.description`, `openinference.span.kind` | OpenInference |
| `agent_name`, `final_result` | Pydantic AI |
| `crewai.agent.role`, `crewai.agent.id` | CrewAI |
| `traceloop.span.kind`, `llm.request.type` | OpenLLMetry |
| `agent_id` | Claude Code |
