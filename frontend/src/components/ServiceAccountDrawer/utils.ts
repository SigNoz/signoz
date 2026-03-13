import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export enum ServiceAccountDrawerTab {
	Overview = 'overview',
	Keys = 'keys',
}

export function formatLastObservedAt(
	lastObservedAt: string | Date | null | undefined,
	formatTimezoneAdjustedTimestamp: (ts: string, format: string) => string,
): string {
	if (!lastObservedAt) {
		return '—';
	}
	const str =
		typeof lastObservedAt === 'string'
			? lastObservedAt
			: lastObservedAt.toISOString();
	// Go zero time means the key has never been used
	if (str.startsWith('0001-01-01')) {
		return '—';
	}
	const d = new Date(str);
	if (Number.isNaN(d.getTime())) {
		return '—';
	}
	return formatTimezoneAdjustedTimestamp(str, DATE_TIME_FORMATS.DASH_DATETIME);
}

export const disabledDate = (current: Dayjs): boolean =>
	!!current && current < dayjs().startOf('day');
