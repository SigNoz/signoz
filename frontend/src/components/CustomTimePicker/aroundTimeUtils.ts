import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Parses an offset string like "15m", "1h", "3h", "1d" into milliseconds.
 * Returns null if the string is not a valid offset.
 */
export function parseOffsetToMs(offset: string): number | null {
	const trimmed = offset.trim();
	const match = /^(\d+)([mhd])$/.exec(trimmed);
	if (!match) {
		return null;
	}

	const amount = parseInt(match[1], 10);
	const unit = match[2];

	const multiplier =
		unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
	const milliseconds = amount * multiplier;
	return Number.isSafeInteger(milliseconds) && milliseconds > 0
		? milliseconds
		: null;
}

// Calendar dates carry wall-clock days in the browser's timezone, not instants.
export function toCalendarDate(date: Date, timezone: string): Date {
	const zoned = dayjs(date).tz(timezone);
	return new Date(zoned.year(), zoned.month(), zoned.date());
}

export function toZonedDateTime(
	date: Date,
	time: { hour: string; minute: string; second: string },
	timezone: string,
): Dayjs {
	return dayjs.tz(
		`${dayjs(date).format('YYYY-MM-DD')} ${time.hour.padStart(2, '0')}:${time.minute.padStart(2, '0')}:${time.second.padStart(2, '0')}`,
		'YYYY-MM-DD HH:mm:ss',
		timezone,
	);
}

export function isValidTime(
	hour: string,
	minute: string,
	second: string,
): boolean {
	return [hour, minute, second].every(
		(value, index) =>
			/^\d{1,2}$/.test(value) && Number(value) <= (index === 0 ? 23 : 59),
	);
}

/** Clamps a numeric string to [0, max], padding to 2 digits. */
export function clampTimeComponent(value: string, max: number): string {
	const n = parseInt(value, 10);
	if (Number.isNaN(n)) {
		return '00';
	}
	const clamped = Math.max(0, Math.min(max, n));
	return String(clamped).padStart(2, '0');
}

/** Returns true if the given offset string is syntactically valid. */
export function isValidOffset(offset: string): boolean {
	return parseOffsetToMs(offset) !== null;
}
