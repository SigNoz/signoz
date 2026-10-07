import { SpanV3 } from 'types/api/trace/getTraceV3';

import { GEN_AI_KEYS, getGenAiValue } from '../utils/genAi';

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
	const value = getGenAiValue(span, key);
	return value === undefined ? undefined : String(value);
}

function getGenAiAttributeAsNumber(
	span: SpanV3,
	key: string,
): number | undefined {
	const value = getGenAiValue(span, key);
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function getSpanAiDetails(span: SpanV3): SpanAiDetails | undefined {
	const usage: SpanAiUsage = {
		inputTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.inputTokens),
		outputTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.outputTokens),
		cacheReadTokens: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.cacheReadTokens),
		cacheCreationTokens: getGenAiAttributeAsNumber(
			span,
			GEN_AI_KEYS.cacheCreationTokens,
		),
		cost: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.cost),
	};
	const hasUsage =
		usage.inputTokens !== undefined || usage.outputTokens !== undefined;

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
		reasoning: getGenAiAttributeAsNumber(span, GEN_AI_KEYS.reasoningTokens),
	};
}
