import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { DropdownMenuSimple as Dropdown } from '@signozhq/ui/dropdown-menu';
import { Typography } from '@signozhq/ui/typography';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { aggregateAttributesResourcesToString } from 'container/LogDetailedView/utils';
import { toast } from '@signozhq/ui/sonner';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import {
	ChevronDown,
	ChevronUp,
	Compass,
	Copy,
	Ellipsis,
	Link,
} from '@signozhq/icons';
import { useTimezone } from 'providers/Timezone';
import { ILog } from 'types/api/logs/log';
import { MouseEvent, MouseEventHandler } from 'react';
import { useCopyToClipboard } from 'react-use';

import styles from './LogDetailsHeader.module.scss';

const TOOLTIP_CONTENT_PROPS = { className: styles.tooltipContent };

interface LogDetailsHeaderProps {
	log: ILog;
	onNavigatePrev: () => void;
	onNavigateNext: () => void;
	isPrevDisabled: boolean;
	isNextDisabled: boolean;
	showOpenInExplorer?: boolean;
	onOpenInExplorer?: MouseEventHandler;
}

function LogDetailsHeader({
	log,
	onNavigatePrev,
	onNavigateNext,
	isPrevDisabled,
	isNextDisabled,
	showOpenInExplorer = false,
	onOpenInExplorer,
}: LogDetailsHeaderProps): JSX.Element {
	const [, copyToClipboard] = useCopyToClipboard();
	const { onLogCopy } = useCopyLogLink(log?.id);
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const handleCopyLog = (): void => {
		copyToClipboard(aggregateAttributesResourcesToString(log));
		toast.success('Copied to clipboard', { position: 'bottom-right' });
	};

	const menuItems = [
		{
			key: 'copy-log',
			label: 'Copy log',
			icon: <Copy size={14} />,
			onClick: handleCopyLog,
		},
		{
			key: 'copy-link',
			label: 'Copy link to log',
			icon: <Link size={14} />,
			onClick: (): void => onLogCopy(),
		},
	];

	return (
		<div className={styles.header} data-log-detail-ignore="true">
			<div className={styles.leftSection}>
				<Divider type="vertical" className={styles.divider} />
				<Typography.Text
					className={styles.timestamp}
					data-testid="log-details-header-timestamp"
				>
					{formatTimezoneAdjustedTimestamp(
						log.date ?? log.timestamp,
						DATE_TIME_FORMATS.DASH_DATETIME,
					)}
				</Typography.Text>
			</div>

			<div className={styles.actions}>
				{showOpenInExplorer && (
					<Button
						variant="outlined"
						color="secondary"
						prefix={<Compass size={16} />}
						onClick={onOpenInExplorer}
					>
						Open in Explorer
					</Button>
				)}

				<Dropdown
					menu={{ items: menuItems }}
					align="end"
					className={styles.dropdownContent}
					onClick={(e: MouseEvent): void => e.stopPropagation()}
				>
					<Button
						variant="link"
						color="secondary"
						prefix={<Ellipsis size={16} />}
						data-testid="log-details-header-menu"
					/>
				</Dropdown>

				<div className={styles.arrows}>
					<TooltipSimple
						title="Move to previous log"
						side="top"
						open={isPrevDisabled ? false : undefined}
						tooltipContentProps={TOOLTIP_CONTENT_PROPS}
					>
						<Button
							variant="outlined"
							color="secondary"
							prefix={<ChevronUp size={14} />}
							disabled={isPrevDisabled}
							onClick={onNavigatePrev}
							data-testid="log-details-header-prev"
						/>
					</TooltipSimple>
					<TooltipSimple
						title="Move to next log"
						side="top"
						open={isNextDisabled ? false : undefined}
						tooltipContentProps={TOOLTIP_CONTENT_PROPS}
					>
						<Button
							variant="outlined"
							color="secondary"
							prefix={<ChevronDown size={14} />}
							disabled={isNextDisabled}
							onClick={onNavigateNext}
							data-testid="log-details-header-next"
						/>
					</TooltipSimple>
				</div>
			</div>
		</div>
	);
}

LogDetailsHeader.defaultProps = {
	showOpenInExplorer: false,
	onOpenInExplorer: undefined,
};

export default LogDetailsHeader;
