# AI observability terms

One name for each thing, in field names, descriptions, column aliases, UI text and tests. The names are those of the AI explorer's per-trace fields, `TraceAggregateFields` in `pkg/telemetryschema/aitelemetryschema/const.go`.

- **LLM call**: a span with `gen_ai.request.model`. Its count is `llm_call_count`, or `llmCallCount` in a camelCase response.
- **Tool call**: a span with `gen_ai.tool.name`. Its count is `tool_call_count`, or `toolCallCount`.
- **gen_ai span**: a span with any of `GenAISpanGateKeys`: an LLM call, a tool call or an agent span.
- **Review check.** "model call", `modelCall` or `model_call` in a name, a description or UI text is a finding: it is an LLM call.
