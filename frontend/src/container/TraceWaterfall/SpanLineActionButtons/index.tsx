import { Link } from '@signozhq/icons';
import { Tooltip } from 'antd';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { Span } from 'types/api/trace/getTraceV2';

import './SpanLineActionButtons.styles.scss';
import { Button } from '@signozhq/ui/button';

export interface SpanLineActionButtonsProps {
	span: Span;
}
export default function SpanLineActionButtons({
	span,
}: SpanLineActionButtonsProps): JSX.Element {
	const { onSpanCopy } = useCopySpanLink(span);

	return (
		<div className="span-line-action-buttons">
			<Tooltip title="Copy Span Link">
				<Button
					onClick={onSpanCopy}
					className="copy-span-btn"
					size="sm"
					variant="outlined"
					color="secondary"
					prefix={<Link size={14} />}
				/>
			</Tooltip>
		</div>
	);
}
