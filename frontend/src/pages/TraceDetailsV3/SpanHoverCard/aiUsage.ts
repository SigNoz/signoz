import { SpanV3 } from 'types/api/trace/getTraceV3';

import { AiTokenCounts, GEN_AI_KEYS, getGenAiValue } from '../utils/genAi';

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
