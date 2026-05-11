import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { Link } from 'lucide-react';
import { Span } from 'types/api/trace/getTraceV2';

import './SpanLineActionButtons.styles.scss';

export interface SpanLineActionButtonsProps {
	span: Span;
}
export default function SpanLineActionButtons({
	span,
}: SpanLineActionButtonsProps): JSX.Element {
	const { onSpanCopy } = useCopySpanLink(span);

	return (
		<div className="span-line-action-buttons">
			<TooltipSimple title="Copy Span Link">
				<Button
					variant="ghost"
					size="icon"
					color="secondary"
					onClick={onSpanCopy}
					className="copy-span-btn"
				>
					<Link size={14} />
				</Button>
			</TooltipSimple>
		</div>
	);
}
