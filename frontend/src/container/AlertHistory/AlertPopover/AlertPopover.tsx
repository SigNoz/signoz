import { Popover } from 'antd';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import { DraftingCompass } from 'lucide-react';
import React from 'react';

type Props = { children: React.ReactNode };

function PopoverContent(): JSX.Element {
	return (
		<div className="contributor-row-popover-buttons">
			<div className="contributor-row-popover-buttons__button">
				<div className="icon">
					<LogsIcon />
				</div>
				<div className="text">View Logs</div>
			</div>
			<div className="contributor-row-popover-buttons__button">
				<div className="icon">
					<DraftingCompass size={14} color="var(--text-vanilla-400)" />
				</div>
				<div className="text">View Traces</div>
			</div>
		</div>
	);
}
function AlertPopover({ children }: Props): JSX.Element {
	return (
		<Popover
			showArrow={false}
			placement="bottom"
			color="linear-gradient(139deg, rgba(18, 19, 23, 1) 0%, rgba(18, 19, 23, 1) 98.68%)"
			destroyTooltipOnHide
			content={<PopoverContent />}
			trigger="click"
		>
			{children}
		</Popover>
	);
}

export default AlertPopover;
