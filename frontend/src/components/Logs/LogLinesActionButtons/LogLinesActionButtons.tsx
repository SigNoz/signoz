import './LogLinesActionButtons.styles.scss';

import { LinkOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { TextSelect } from 'lucide-react';
import { MouseEventHandler } from 'react';

export interface LogLinesActionButtonsProps {
	handleShowContext: MouseEventHandler<HTMLElement>;
	onLogCopy: MouseEventHandler<HTMLElement>;
	customClassName?: string;
}
export default function LogLinesActionButtons({
	handleShowContext,
	onLogCopy,
	customClassName = '',
}: LogLinesActionButtonsProps): JSX.Element {
	return (
		<div className={`log-line-action-buttons ${customClassName}`}>
			<Tooltip title="Show in Context">
				<Button
					size="small"
					icon={<TextSelect size={14} />}
					className="show-context-btn"
					onClick={handleShowContext}
				/>
			</Tooltip>
			<Tooltip title="Copy Link">
				<Button
					size="small"
					icon={<LinkOutlined size={14} />}
					onClick={onLogCopy}
					className="copy-log-btn"
				/>
			</Tooltip>
		</div>
	);
}

LogLinesActionButtons.defaultProps = {
	customClassName: '',
};
