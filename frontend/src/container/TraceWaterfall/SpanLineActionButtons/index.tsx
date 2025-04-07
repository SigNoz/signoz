import './SpanLineActionButtons.styles.scss';

import { LinkOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { Span } from 'types/api/trace/getTraceV2';

export interface SpanLineActionButtonsProps {
	span: Span;
	customClassName?: string;
}
export default function SpanLineActionButtons({
	span,
	customClassName = '',
}: SpanLineActionButtonsProps): JSX.Element {
	const { onSpanCopy } = useCopySpanLink(span);

	return (
		<div className={`span-line-action-buttons ${customClassName}`}>
			<Tooltip title="Copy Span Link">
				<Button
					size="small"
					icon={<LinkOutlined size={14} />}
					onClick={onSpanCopy}
					className="copy-span-btn"
				/>
			</Tooltip>
		</div>
	);
}

SpanLineActionButtons.defaultProps = {
	customClassName: '',
};
