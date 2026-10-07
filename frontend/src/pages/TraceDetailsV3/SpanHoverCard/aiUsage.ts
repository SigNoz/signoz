import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { GEN_AI_KEYS } from '../utils/genAi';

export interface TokenUsage {
	input: number;
	output: number;
	cacheRead?: number;
	cacheWrite?: number;
	reasoning?: number;
}

export interface SpanAiUsage {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheCreationTokens?: number;
	cost?: number;
	isAnthropic: boolean;
}

export interface SpanAiDetails {
	model?: string;
	toolName?: string;
	agentName?: string;
	usage?: SpanAiUsage;
}

function getNumber(span: SpanV3, key: string): number | undefined {
	const value = getSpanAttribute(span, key);
	if (value === undefined || value === '') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function isAnthropicSpan(span: SpanV3): boolean {
	const provider = (
		getSpanAttribute(span, GEN_AI_KEYS.providerName) ??
		getSpanAttribute(span, GEN_AI_KEYS.system) ??
		''
	).toLowerCase();
	const model = (
		getSpanAttribute(span, GEN_AI_KEYS.responseModel) ??
		getSpanAttribute(span, GEN_AI_KEYS.requestModel) ??
		''
	).toLowerCase();

	return (
		provider === 'anthropic' ||
		model.includes('claude') ||
		model.includes('anthropic')
	);
}

export function getSpanAiDetails(span: SpanV3): SpanAiDetails | undefined {
	const usage: SpanAiUsage = {
		inputTokens: getNumber(span, GEN_AI_KEYS.inputTokens),
		outputTokens: getNumber(span, GEN_AI_KEYS.outputTokens),
		cacheReadTokens: getNumber(span, GEN_AI_KEYS.cacheReadTokens),
		cacheCreationTokens: getNumber(span, GEN_AI_KEYS.cacheCreationTokens),
		cost: getNumber(span, GEN_AI_KEYS.cost),
		isAnthropic: isAnthropicSpan(span),
	};
	const hasUsage =
		usage.inputTokens !== undefined || usage.outputTokens !== undefined;

	const details: SpanAiDetails = {
		model: getSpanAttribute(span, GEN_AI_KEYS.requestModel) || undefined,
		toolName: getSpanAttribute(span, GEN_AI_KEYS.toolName) || undefined,
		agentName: getSpanAttribute(span, GEN_AI_KEYS.agentName) || undefined,
		usage: hasUsage ? usage : undefined,
	};

	return details.model || details.toolName || details.agentName || hasUsage
		? details
		: undefined;
}

/**
 * Anthropic reports input_tokens without cached tokens; every other provider
 * (OpenAI, Azure OpenAI, Gemini, Mistral, DeepSeek, Groq, xAI) counts cached
 * tokens inside input_tokens.
 */
export function getUsageTotals(usage: SpanAiUsage): {
	inputUsage: number;
	totalUsage: number;
} {
	const input = usage.inputTokens ?? 0;
	const inputUsage = usage.isAnthropic
		? input + (usage.cacheReadTokens ?? 0) + (usage.cacheCreationTokens ?? 0)
		: input;

	return { inputUsage, totalUsage: inputUsage + (usage.outputTokens ?? 0) };
}

export function formatTokens(value: number): string {
	return value.toLocaleString('en-US');
}

export function formatCost(value: number): string {
	return `$ ${value.toLocaleString('en-US', { maximumFractionDigits: 10 })}`;
}

export function getSpanTokenUsage(span: SpanV3): TokenUsage | undefined {
	const usage = getSpanAiDetails(span)?.usage;
	if (!usage) {
		return undefined;
	}
	return {
		input: usage.inputTokens ?? 0,
		output: usage.outputTokens ?? 0,
		cacheRead: usage.cacheReadTokens,
		cacheWrite: usage.cacheCreationTokens,
		reasoning: getNumber(span, GEN_AI_KEYS.reasoningTokens),
	};
}
