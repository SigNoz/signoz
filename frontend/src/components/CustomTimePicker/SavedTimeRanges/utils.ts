import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';

export const formatTimeRangeLabel = (
	from: string,
	to: string,
	timezone: string,
): string =>
	`${dayjs(from)
		.tz(timezone)
		.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS)} - ${dayjs(to)
		.tz(timezone)
		.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS)}`;
