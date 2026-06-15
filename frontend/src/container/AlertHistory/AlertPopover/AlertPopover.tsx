import React from 'react';
import { Link } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { Popover } from 'antd';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { DraftingCompass } from '@signozhq/icons';

import styles from './AlertPopover.module.scss';

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
	const isDarkMode = useIsDarkMode();
	return (
		<div className={styles.contributorRowPopoverButtons}>
			{!!relatedLogsLink && (
				<Link
					to={`${ROUTES.LOGS_EXPLORER}?${relatedLogsLink}`}
					className={styles.contributorRowPopoverButtonsButton}
				>
					<div>
						<LogsIcon />
					</div>
					<div>View Logs</div>
				</Link>
			)}
			{!!relatedTracesLink && (
				<Link
					to={`${ROUTES.TRACES_EXPLORER}?${relatedTracesLink}`}
					className={styles.contributorRowPopoverButtonsButton}
				>
					<div>
						<DraftingCompass
							size={14}
							color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
						/>
					</div>
					<div>View Traces</div>
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
		<div className={styles.alertPopoverTriggerAction}>
			<Popover
				showArrow={false}
				placement="bottom"
				color="linear-gradient(139deg, rgba(18, 19, 23, 1) 0%, rgba(18, 19, 23, 1) 98.68%)"
				destroyTooltipOnHide
				rootClassName={styles.alertHistoryPopover}
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

type ConditionalAlertPopoverProps = {
	relatedTracesLink: string;
	relatedLogsLink: string;
	children: React.ReactNode;
};
export function ConditionalAlertPopover({
	children,
	relatedTracesLink,
	relatedLogsLink,
}: ConditionalAlertPopoverProps): JSX.Element {
	if (relatedTracesLink || relatedLogsLink) {
		return (
			<AlertPopover
				relatedTracesLink={relatedTracesLink}
				relatedLogsLink={relatedLogsLink}
			>
				{children}
			</AlertPopover>
		);
	}
	return <div>{children}</div>;
}
