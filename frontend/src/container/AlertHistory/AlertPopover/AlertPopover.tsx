import React from 'react';
import { Link } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { Popover } from 'antd';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Brain, DraftingCompass } from '@signozhq/icons';

import './AlertPopover.styles.scss';

type Props = {
	children: React.ReactNode;
	relatedTracesLink?: string;
	relatedLogsLink?: string;
	relatedAITracesLink?: string;
};

function PopoverContent({
	relatedTracesLink,
	relatedLogsLink,
	relatedAITracesLink,
}: {
	relatedTracesLink?: Props['relatedTracesLink'];
	relatedLogsLink?: Props['relatedLogsLink'];
	relatedAITracesLink?: Props['relatedAITracesLink'];
}): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<div className="contributor-row-popover-buttons">
			{!!relatedLogsLink && (
				<Link
					to={`${ROUTES.LOGS_EXPLORER}?${relatedLogsLink}`}
					className="contributor-row-popover-buttons__button"
					data-testid="alert-popover-view-logs"
				>
					<div className="icon">
						<LogsIcon />
					</div>
					<div className="text">View Logs</div>
				</Link>
			)}
			{!!relatedTracesLink && (
				<Link
					to={`${ROUTES.TRACES_EXPLORER}?${relatedTracesLink}`}
					className="contributor-row-popover-buttons__button"
					data-testid="alert-popover-view-traces"
				>
					<div className="icon">
						<DraftingCompass
							size={14}
							color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
						/>
					</div>
					<div className="text">View Traces</div>
				</Link>
			)}
			{!!relatedAITracesLink && (
				<Link
					to={`${ROUTES.AI_OBSERVABILITY_EXPLORER}?${relatedAITracesLink}`}
					className="contributor-row-popover-buttons__button"
					data-testid="alert-popover-view-ai-traces"
				>
					<div className="icon">
						<Brain
							size={14}
							color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
						/>
					</div>
					<div className="text">View AI Traces</div>
				</Link>
			)}
		</div>
	);
}
PopoverContent.defaultProps = {
	relatedTracesLink: '',
	relatedLogsLink: '',
	relatedAITracesLink: '',
};

function AlertPopover({
	children,
	relatedTracesLink,
	relatedLogsLink,
	relatedAITracesLink,
}: Props): JSX.Element {
	return (
		<div className="alert-popover-trigger-action">
			<Popover
				showArrow={false}
				placement="bottom"
				color="linear-gradient(139deg, rgba(18, 19, 23, 1) 0%, rgba(18, 19, 23, 1) 98.68%)"
				destroyTooltipOnHide
				rootClassName="alert-history-popover"
				content={
					<PopoverContent
						relatedTracesLink={relatedTracesLink}
						relatedLogsLink={relatedLogsLink}
						relatedAITracesLink={relatedAITracesLink}
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
	relatedAITracesLink: '',
};

type ConditionalAlertPopoverProps = {
	relatedTracesLink: string;
	relatedLogsLink: string;
	relatedAITracesLink: string;
	children: React.ReactNode;
};
export function ConditionalAlertPopover({
	children,
	relatedTracesLink,
	relatedLogsLink,
	relatedAITracesLink,
}: ConditionalAlertPopoverProps): JSX.Element {
	if (relatedTracesLink || relatedLogsLink || relatedAITracesLink) {
		return (
			<AlertPopover
				relatedTracesLink={relatedTracesLink}
				relatedLogsLink={relatedLogsLink}
				relatedAITracesLink={relatedAITracesLink}
			>
				{children}
			</AlertPopover>
		);
	}
	return <div>{children}</div>;
}
export default AlertPopover;
