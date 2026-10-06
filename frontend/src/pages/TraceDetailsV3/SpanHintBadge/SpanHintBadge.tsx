import { Badge } from '@signozhq/ui/badge';
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getAiSpanKind } from '../utils/genAi';
import { AI_SPAN_BADGES } from './constants';

interface SpanHintBadgeProps {
	span: SpanV3;
}

function SpanHintBadge({ span }: SpanHintBadgeProps): JSX.Element | null {
	const aiSpanKind = getAiSpanKind(span);

	if (aiSpanKind) {
		const { label, color } = AI_SPAN_BADGES[aiSpanKind];
		return (
			<Badge
				color={color}
				variant="outline"
				data-testid={`span-hint-badge-${aiSpanKind}`}
			>
				{label}
			</Badge>
		);
	}

	if (!span.response_status_code) {
		return null;
	}

	return <HttpStatusBadge statusCode={span.response_status_code} />;
}

export default SpanHintBadge;
