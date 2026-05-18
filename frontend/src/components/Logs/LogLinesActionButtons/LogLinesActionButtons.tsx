import { memo, MouseEventHandler } from 'react';
import { Link, TextSelect } from '@signozhq/icons';
import { Tooltip } from 'antd';

import './LogLinesActionButtons.styles.scss';
import { Button } from '@signozhq/ui/button';

export interface LogLinesActionButtonsProps {
	handleShowContext: MouseEventHandler<HTMLElement>;
	onLogCopy: MouseEventHandler<HTMLElement>;
	customClassName?: string;
}

function LogLinesActionButtons({
	handleShowContext,
	onLogCopy,
	customClassName = '',
}: LogLinesActionButtonsProps): JSX.Element {
	return (
		<div className={`log-line-action-buttons ${customClassName}`}>
			<Tooltip title="Show in Context">
				<Button
					className="show-context-btn"
					onClick={handleShowContext}
					size="sm"
					variant="outlined"
					color="secondary"
					prefix={<TextSelect size={14} />}
				/>
			</Tooltip>
			<Tooltip title="Copy Link">
				<Button
					onClick={onLogCopy}
					className="copy-log-btn"
					size="sm"
					variant="outlined"
					color="secondary"
					prefix={<Link size={14} />}
				/>
			</Tooltip>
		</div>
	);
}

LogLinesActionButtons.defaultProps = {
	customClassName: '',
};

export default memo(LogLinesActionButtons);
