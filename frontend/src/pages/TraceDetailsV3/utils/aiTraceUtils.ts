import { SpanV3 } from 'types/api/trace/getTraceV3';
import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';

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
	inputMessages: 'gen_ai.input.messages',
	outputMessages: 'gen_ai.output.messages',
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

function hasAttribute(span: SpanV3, key: string): boolean {
	return getSpanAttribute(span, key) !== undefined;
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
	input?: number;
	output?: number;
	cacheRead?: number;
	cacheWrite?: number;
	reasoning?: number;
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
}: AiTokenCounts): number {
	const inputValue = input ?? 0;
	const cache = (cacheRead ?? 0) + (cacheWrite ?? 0);
	return inputValue < cache ? inputValue + cache : inputValue;
}

/** `Input Token` for a count of 1, `Input Tokens` otherwise. */
export function getTokenLabel(
	prefix: string,
	count: number | null | undefined,
): string {
	return `${prefix} ${count === 1 ? 'Token' : 'Tokens'}`;
}

/** Missing values render as `0`. */
export function formatTokens(value: number | null | undefined): string {
	return hasValue(value) ? value.toLocaleString('en-US') : '0';
}

export function formatCost(value: number): string {
	return `$ ${value.toLocaleString('en-US', { maximumFractionDigits: 10 })}`;
}

export interface SpanAiUsage {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheCreationTokens?: number;
	reasoningTokens?: number;
	cost?: number;
}

export interface SpanAiDetails {
	model?: string;
	toolName?: string;
	agentName?: string;
	usage?: SpanAiUsage;
}

function getGenAiAttributeAsString(
	span: SpanV3,
	key: string,
): string | undefined {
	const value = getSpanAttribute(span, key);
	return value === undefined ? undefined : String(value);
}

function getGenAiAttributeAsNumber(
	span: SpanV3,
	key: string,
): number | undefined {
	const value = getSpanAttribute(span, key);
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function getAIUsageDetails(span: SpanV3): SpanAiDetails | undefined {
	const usage: SpanAiUsage = {
		inputTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.inputTokens),
		outputTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.outputTokens),
		cacheReadTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.cacheReadTokens),
		cacheCreationTokens: getGenAiAttributeAsNumber(
			span,
			GEN_AI_KEYS.cacheCreationTokens,
		),
		reasoningTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.reasoningTokens),
		cost: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.cost),
	};
	const hasUsage = Object.values(usage).some((value) => value !== undefined);

	const details: SpanAiDetails = {
		model: getGenAiAttributeAsString(span, GEN_AI_KEYS.requestModel),
		toolName: getGenAiAttributeAsString(span, GEN_AI_KEYS.toolName),
		agentName: getGenAiAttributeAsString(span, GEN_AI_KEYS.agentName),
		usage: hasUsage ? usage : undefined,
	};

	return details.model || details.toolName || details.agentName || hasUsage
		? details
		: undefined;
}

export function convertToAiTokens(usage: SpanAiUsage): AiTokenCounts {
	return {
		input: usage.inputTokens,
		output: usage.outputTokens,
		cacheRead: usage.cacheReadTokens,
		cacheWrite: usage.cacheCreationTokens,
		reasoning: usage.reasoningTokens,
	};
}
