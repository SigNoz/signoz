import { Button } from '@signozhq/ui/button';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { Link } from '@signozhq/icons';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import styles from './SpanLineActionButtons.module.scss';

export interface SpanLineActionButtonsProps {
	span: SpanV3;
}
export default function SpanLineActionButtons({
	span,
}: SpanLineActionButtonsProps): JSX.Element {
	const { onSpanCopy } = useCopySpanLink(span);

	return (
		<div className={styles.root}>
			<TooltipProvider>
				<TooltipRoot>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							color="secondary"
							onClick={onSpanCopy}
							className={styles.copyBtn}
						>
							<Link size={14} />
						</Button>
					</TooltipTrigger>
					<TooltipContent className={styles.tooltip}>Copy Span Link</TooltipContent>
				</TooltipRoot>
			</TooltipProvider>
		</div>
	);
}
