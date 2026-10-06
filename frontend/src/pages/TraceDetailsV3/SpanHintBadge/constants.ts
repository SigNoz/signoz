import { ComponentProps } from 'react';
import { Badge } from '@signozhq/ui/badge';

import { AiSpanKind } from '../utils/genAi';

type BadgeColor = ComponentProps<typeof Badge>['color'];

export const AI_SPAN_BADGES: Record<
	AiSpanKind,
	{ label: string; color: BadgeColor }
> = {
	[AiSpanKind.Llm]: { label: 'LLM', color: 'aqua' },
	[AiSpanKind.Tool]: { label: 'TOOL', color: 'amber' },
	[AiSpanKind.Agent]: { label: 'AGENT', color: 'sakura' },
};
