import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { Typography } from '@signozhq/ui/typography';
import { Tooltip } from '@signozhq/ui/tooltip';
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
import { normalizeTimeToMs } from 'utils/timeUtils';
import { ILog } from 'types/api/logs/log';
import { MouseEvent, MouseEventHandler } from 'react';
import { useCopyToClipboard } from 'react-use';

import styles from './LogDetailsHeader.module.scss';

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

	const menuItems: DropdownItemType[] = [
		{
			type: 'item',
			value: 'copy-log',
			label: 'Copy log',
			prefix: <Copy size={14} />,
			onClick: handleCopyLog,
		},
		{
			type: 'item',
			value: 'copy-link',
			label: 'Copy link to log',
			prefix: <Link size={14} />,
			onClick: (): void => onLogCopy(),
		},
	];

	const rawTimestamp = log.date ?? log.timestamp;
	const displayTimestamp = Number.isNaN(Number(rawTimestamp))
		? rawTimestamp
		: normalizeTimeToMs(rawTimestamp);

	return (
		<div className={styles.header} data-log-detail-ignore="true">
			<div className={styles.leftSection}>
				<Divider type="vertical" className={styles.divider} />
				<Typography.Text
					className={styles.timestamp}
					data-testid="log-details-header-timestamp"
				>
					{formatTimezoneAdjustedTimestamp(
						displayTimestamp,
						DATE_TIME_FORMATS.DASH_DATETIME,
					)}
				</Typography.Text>
			</div>

			<div className={styles.actions}>
				{showOpenInExplorer && (
					<Button
						size="md"
						variant="outlined"
						color="secondary"
						prefix={<Compass size={16} />}
						onClick={onOpenInExplorer}
					>
						Open in Explorer
					</Button>
				)}

				<Dropdown items={menuItems} nativeButton align="end" side="bottom">
					<Button
						size="md"
						variant="link"
						color="secondary"
						icon
						aria-label="Log actions"
						testId="log-details-header-menu"
						onClick={(e: MouseEvent): void => e.stopPropagation()}
					>
						<Ellipsis size={16} />
					</Button>
				</Dropdown>

				<div className={styles.arrows}>
					<Tooltip
						title={isPrevDisabled ? undefined : 'Move to previous log'}
						side="top"
					>
						<Button
							disabledTooltip="No previous log"
							size="md"
							variant="outlined"
							color="secondary"
							icon
							aria-label="Move to previous log"
							disabled={isPrevDisabled}
							onClick={onNavigatePrev}
							testId="log-details-header-prev"
						>
							<ChevronUp size={14} />
						</Button>
					</Tooltip>
					<Tooltip
						title={isNextDisabled ? undefined : 'Move to next log'}
						side="top"
					>
						<Button
							disabledTooltip="No next log"
							size="md"
							variant="outlined"
							color="secondary"
							icon
							aria-label="Move to next log"
							disabled={isNextDisabled}
							onClick={onNavigateNext}
							testId="log-details-header-next"
						>
							<ChevronDown size={14} />
						</Button>
					</Tooltip>
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
