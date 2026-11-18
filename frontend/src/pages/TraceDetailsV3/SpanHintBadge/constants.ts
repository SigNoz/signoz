import type { BadgeColorType } from '@signozhq/ui/badge';

import { AiSpanKind } from '../utils/aiTraceUtils';

export const AI_SPAN_BADGES: Record<
	AiSpanKind,
	{ label: string; color: BadgeColorType }
> = {
	[AiSpanKind.Llm]: { label: 'LLM', color: 'success' },
	[AiSpanKind.Tool]: { label: 'TOOL', color: 'warning' },
	[AiSpanKind.Agent]: { label: 'AGENT', color: 'highlight-danger' },
};
