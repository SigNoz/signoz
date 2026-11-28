import { Tooltip } from '@signozhq/ui/tooltip';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';

import styles from './TimeCell.module.scss';

interface TimeCellProps {
	date: string;
}

export function TimeCell({ date }: TimeCellProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<Tooltip
			title={formatTimezoneAdjustedTimestamp(
				date,
				DATE_TIME_FORMATS.ISO_DATETIME_MS,
			)}
		>
			<div className={styles.timeCell}>
				<TanStackTable.Text>
					{formatTimezoneAdjustedTimestamp(date, DATE_TIME_FORMATS.MONTH_DAY)}
				</TanStackTable.Text>
				<TanStackTable.Text>
					{formatTimezoneAdjustedTimestamp(date, DATE_TIME_FORMATS.TIME)}
				</TanStackTable.Text>
			</div>
		</Tooltip>
	);
}
