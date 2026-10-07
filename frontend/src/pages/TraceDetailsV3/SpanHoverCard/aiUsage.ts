import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { GEN_AI_KEYS } from '../utils/genAi';

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

function getNumber(span: SpanV3, key: string): number | undefined {
	const value = getSpanAttribute(span, key);
	if (value === undefined || value === '') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function getSpanAiDetails(span: SpanV3): SpanAiDetails | undefined {
	const usage: SpanAiUsage = {
		inputTokens: getNumber(span, GEN_AI_KEYS.inputTokens),
		outputTokens: getNumber(span, GEN_AI_KEYS.outputTokens),
		cacheReadTokens: getNumber(span, GEN_AI_KEYS.cacheReadTokens),
		cacheCreationTokens: getNumber(span, GEN_AI_KEYS.cacheCreationTokens),
		cost: getNumber(span, GEN_AI_KEYS.cost),
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

export function formatTokens(value: number): string {
	return value.toLocaleString('en-US');
}

export function formatCost(value: number): string {
	return `$ ${value.toLocaleString('en-US', { maximumFractionDigits: 10 })}`;
}
