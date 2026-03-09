import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

export function formatLastUsed(
	lastUsed: Date | null | undefined,
	formatTimezoneAdjustedTimestamp: (ts: string, format: string) => string,
): string {
	if (!lastUsed) {
		return '—';
	}
	const d = new Date(lastUsed);
	if (Number.isNaN(d.getTime())) {
		return '—';
	}
	return formatTimezoneAdjustedTimestamp(
		d.toISOString(),
		DATE_TIME_FORMATS.DASH_DATETIME,
	);
}
