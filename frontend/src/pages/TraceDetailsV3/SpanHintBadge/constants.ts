import { AiSpanKind } from '../utils/genAi';

export const AI_SPAN_BADGES: Record<
	AiSpanKind,
	{ label: string; color: string }
> = {
	[AiSpanKind.Llm]: { label: 'LLM', color: 'rgba(155, 255, 0, 1)' },
	[AiSpanKind.Tool]: { label: 'TOOL', color: 'rgba(255, 209, 0, 1)' },
	[AiSpanKind.Agent]: { label: 'AGENT', color: 'rgba(255, 10, 138, 1)' },
};
