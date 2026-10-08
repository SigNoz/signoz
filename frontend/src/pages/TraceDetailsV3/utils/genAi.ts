import { SpanV3 } from 'types/api/trace/getTraceV3';

export const GEN_AI_KEYS = {
	requestModel: 'gen_ai.request.model',
	toolName: 'gen_ai.tool.name',
	agentName: 'gen_ai.agent.name',
	inputTokens: 'gen_ai.usage.input_tokens',
	outputTokens: 'gen_ai.usage.output_tokens',
	cacheReadTokens: 'gen_ai.usage.cache_read.input_tokens',
	cacheCreationTokens: 'gen_ai.usage.cache_creation.input_tokens',
	reasoningTokens: 'gen_ai.usage.reasoning.output_tokens',
	cost: 'signoz.gen_ai.usage.tokens.cost',
} as const;

export enum AiSpanKind {
	Llm = 'llm',
	Tool = 'tool',
	Agent = 'agent',
}

const LLM_KEYS = [
	GEN_AI_KEYS.requestModel,
	GEN_AI_KEYS.inputTokens,
	GEN_AI_KEYS.outputTokens,
	GEN_AI_KEYS.cacheReadTokens,
	GEN_AI_KEYS.cacheCreationTokens,
	GEN_AI_KEYS.reasoningTokens,
];

/** Keeps numeric 0, which `getSpanAttribute`'s `||` chain drops. */
export function getGenAiValue(
	span: SpanV3,
	key: string,
): string | number | boolean | undefined {
	const value = span.attributes?.[key] ?? span.resource?.[key];
	return value === '' ? undefined : value;
}

function hasAttribute(span: SpanV3, key: string): boolean {
	return getGenAiValue(span, key) !== undefined;
}

/** Tool and agent spans may also carry model or usage keys, so they win over LLM. */
export function getAiSpanKind(span: SpanV3): AiSpanKind | undefined {
	if (hasAttribute(span, GEN_AI_KEYS.toolName)) {
		return AiSpanKind.Tool;
	}
	if (hasAttribute(span, GEN_AI_KEYS.agentName)) {
		return AiSpanKind.Agent;
	}
	if (LLM_KEYS.some((key) => hasAttribute(span, key))) {
		return AiSpanKind.Llm;
	}
	return undefined;
}

export function isAiSpan(span: SpanV3): boolean {
	return getAiSpanKind(span) !== undefined;
}

/** Token counts; `null` or missing means the backend did not send the value. */
export interface AiTokenCounts {
	input?: number | null;
	output?: number | null;
	cacheRead?: number | null;
	cacheWrite?: number | null;
	reasoning?: number | null;
}

export function hasValue(value: number | null | undefined): value is number {
	return value !== undefined && value !== null;
}

/**
 * Input including cache read/write, counted once. Providers that report cache
 * inside `input` (OpenAI) have `input >= cache`; those that report it
 * separately (Anthropic) usually have `input < cache`.
 */
export function getTotalInputTokens({
	input,
	cacheRead,
	cacheWrite,
}: AiTokenCounts): number | undefined {
	if (!hasValue(input)) {
		return undefined;
	}
	const cache = (cacheRead ?? 0) + (cacheWrite ?? 0);
	return input < cache ? input + cache : input;
}

/** Missing values render as `-`. */
export function formatTokens(value: number | null | undefined): string {
	return hasValue(value) ? value.toLocaleString('en-US') : '-';
}

export function formatCost(value: number): string {
	return `$ ${value.toLocaleString('en-US', { maximumFractionDigits: 10 })}`;
}
