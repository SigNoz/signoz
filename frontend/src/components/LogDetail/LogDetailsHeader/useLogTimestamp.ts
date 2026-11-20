import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';
import { ILog } from 'types/api/logs/log';
import { normalizeTimeToMs } from 'utils/timeUtils';

export function useLogTimestamp(log: ILog | null): string {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (!log) {
		return '';
	}

	const rawTimestamp = log.date ?? log.timestamp;
	const displayTimestamp = Number.isNaN(Number(rawTimestamp))
		? rawTimestamp
		: normalizeTimeToMs(rawTimestamp);

	return formatTimezoneAdjustedTimestamp(
		displayTimestamp,
		DATE_TIME_FORMATS.DASH_DATETIME,
	);
}
