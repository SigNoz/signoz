import { Button } from '@signozhq/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { Link } from '@signozhq/icons';
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
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							color="secondary"
							onClick={onSpanCopy}
							className="copy-span-btn"
						>
							<Link size={14} />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="span-line-action-tooltip">
						Copy Span Link
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}
