import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface Timezone {
	name: string;
	value: string;
	offset: string;
	searchIndex: string;
	hasDivider?: boolean;
}

const TIMEZONE_TYPES = {
	BROWSER: 'BROWSER',
	UTC: 'UTC',
	STANDARD: 'STANDARD',
} as const;

type TimezoneType = typeof TIMEZONE_TYPES[keyof typeof TIMEZONE_TYPES];

export const UTC_TIMEZONE: Timezone = {
	name: 'Coordinated Universal Time — UTC, GMT',
	value: 'UTC',
	offset: 'UTC',
	searchIndex: 'UTC',
	hasDivider: true,
};

const normalizeTimezoneName = (timezone: string): string => {
	// https://github.com/tc39/proposal-temporal/issues/1076
	if (timezone === 'Asia/Calcutta') {
		return 'Asia/Kolkata';
	}
	return timezone;
};

const formatOffset = (offsetMinutes: number): string => {
	if (offsetMinutes === 0) return 'UTC';

	const hours = Math.floor(Math.abs(offsetMinutes) / 60);
	const minutes = Math.abs(offsetMinutes) % 60;
	const sign = offsetMinutes > 0 ? '+' : '-';

	return `UTC ${sign} ${hours}${
		minutes ? `:${minutes.toString().padStart(2, '0')}` : ':00'
	}`;
};

const createTimezoneEntry = (
	name: string,
	offsetMinutes: number,
	type: TimezoneType = TIMEZONE_TYPES.STANDARD,
	hasDivider = false,
): Timezone => {
	const offset = formatOffset(offsetMinutes);
	let value = name;
	let displayName = name;

	switch (type) {
		case TIMEZONE_TYPES.BROWSER:
			displayName = `Browser time — ${name}`;
			value = name;
			break;
		case TIMEZONE_TYPES.UTC:
			displayName = 'Coordinated Universal Time — UTC, GMT';
			value = 'UTC';
			break;
		case TIMEZONE_TYPES.STANDARD:
			displayName = name;
			value = name;
			break;
		default:
			console.error(`Invalid timezone type: ${type}`);
	}

	return {
		name: displayName,
		value,
		offset,
		searchIndex: offset.replace(/ /g, ''),
		...(hasDivider && { hasDivider }),
	};
};

const getOffsetByTimezone = (timezone: string): number => {
	const dayjsTimezone = dayjs().tz(timezone);
	return dayjsTimezone.utcOffset();
};

export const getBrowserTimezone = (): Timezone => {
	const browserTz = dayjs.tz.guess();
	const normalizedTz = normalizeTimezoneName(browserTz);
	const browserOffset = getOffsetByTimezone(normalizedTz);
	return createTimezoneEntry(
		normalizedTz,
		browserOffset,
		TIMEZONE_TYPES.BROWSER,
	);
};

const filterAndSortTimezones = (
	allTimezones: string[],
	browserTzName?: string,
	includeEtcTimezones = false,
): Timezone[] =>
	allTimezones
		.filter((tz) => {
			const isNotBrowserTz = tz !== browserTzName;
			const isNotEtcTz = includeEtcTimezones || !tz.startsWith('Etc/');
			return isNotBrowserTz && isNotEtcTz;
		})
		.sort((a, b) => a.localeCompare(b))
		.map((tz) => {
			const normalizedTz = normalizeTimezoneName(tz);
			const offset = getOffsetByTimezone(normalizedTz);
			return createTimezoneEntry(normalizedTz, offset);
		});

const generateTimezoneData = (includeEtcTimezones = false): Timezone[] => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const allTimezones = (Intl as any).supportedValuesOf('timeZone');
	const timezones: Timezone[] = [];

	// Add browser timezone
	const browserTzObject = getBrowserTimezone();
	timezones.push(browserTzObject);

	// Add UTC timezone with divider
	timezones.push(UTC_TIMEZONE);

	timezones.push(
		...filterAndSortTimezones(
			allTimezones,
			browserTzObject.value,
			includeEtcTimezones,
		),
	);

	return timezones;
};

export const getTimezoneObjectByTimezoneString = (
	timezone: string,
): Timezone => {
	const utcOffset = getOffsetByTimezone(timezone);
	return createTimezoneEntry(timezone, utcOffset);
};

export const TIMEZONE_DATA = generateTimezoneData();
