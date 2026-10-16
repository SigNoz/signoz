import { CSSProperties } from 'react';
import { Badge } from '@signozhq/ui/badge';
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getAiSpanKind } from '../utils/aiTraceUtils';
import { AI_SPAN_BADGES } from './constants';

import styles from './SpanHintBadge.module.scss';

interface SpanHintBadgeProps {
	span: SpanV3;
}

function SpanHintBadge({ span }: SpanHintBadgeProps): JSX.Element | null {
	const aiSpanKind = getAiSpanKind(span);

	if (aiSpanKind) {
		const { label, color } = AI_SPAN_BADGES[aiSpanKind];
		return (
			<span
				className={styles.aiBadge}
				// The outline variant derives text, fill and border from this color.
				style={{ '--ai-badge-color': color } as CSSProperties}
			>
				<Badge
					variant="outlined"
					color="primary"
					testId={`span-hint-badge-${aiSpanKind}`}
				>
					{label}
				</Badge>
			</span>
		);
	}

	if (!span.response_status_code) {
		return null;
	}

	return <HttpStatusBadge statusCode={span.response_status_code} />;
}

export default SpanHintBadge;
