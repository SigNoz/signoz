import { Popover } from 'antd';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import ROUTES from 'constants/routes';
import { DraftingCompass } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
	children: React.ReactNode;
	relatedTracesLink?: string;
	relatedLogsLink?: string;
};

function PopoverContent({
	relatedTracesLink,
	relatedLogsLink,
}: {
	relatedTracesLink?: Props['relatedTracesLink'];
	relatedLogsLink?: Props['relatedLogsLink'];
}): JSX.Element {
	return (
		<div className="contributor-row-popover-buttons">
			{!!relatedTracesLink && (
				<Link
					to={`${ROUTES.LOGS_EXPLORER}/${relatedTracesLink}`}
					className="contributor-row-popover-buttons__button"
				>
					<div className="icon">
						<LogsIcon />
					</div>
					<div className="text">View Logs</div>
				</Link>
			)}
			{!!relatedLogsLink && (
				<Link
					to={`${ROUTES.TRACES_EXPLORER}/${relatedLogsLink}`}
					className="contributor-row-popover-buttons__button"
				>
					<div className="icon">
						<DraftingCompass size={14} color="var(--text-vanilla-400)" />
					</div>
					<div className="text">View Traces</div>
				</Link>
			)}
		</div>
	);
}
PopoverContent.defaultProps = {
	relatedTracesLink: '',
	relatedLogsLink: '',
};

function AlertPopover({
	children,
	relatedTracesLink,
	relatedLogsLink,
}: Props): JSX.Element {
	return (
		<div className="alert-popover">
			<Popover
				showArrow={false}
				placement="bottom"
				color="linear-gradient(139deg, rgba(18, 19, 23, 1) 0%, rgba(18, 19, 23, 1) 98.68%)"
				destroyTooltipOnHide
				content={
					<PopoverContent
						relatedTracesLink={relatedTracesLink}
						relatedLogsLink={relatedLogsLink}
					/>
				}
				trigger="click"
			>
				{children}
			</Popover>
		</div>
	);
}

AlertPopover.defaultProps = {
	relatedTracesLink: '',
	relatedLogsLink: '',
};
export default AlertPopover;
