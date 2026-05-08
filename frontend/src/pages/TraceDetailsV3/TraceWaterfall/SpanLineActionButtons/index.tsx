import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui';
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
