import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
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
			<Tooltip title="Copy Span Link" className={styles.tooltip}>
				<Button
					aria-label="Action"
					variant="ghost"
					size="sm"
					icon
					color="secondary"
					onClick={onSpanCopy}
					className={styles.copyBtn}
				>
					<Link size={14} />
				</Button>
			</Tooltip>
		</div>
	);
}
