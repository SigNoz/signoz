import { getTimeZones } from '@vvo/tzdb';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Timezone {
	name: string;
	offset: string;
	searchIndex: string;
	hasDivider?: boolean;
}

// Constants
const UTC_TIMEZONE: Timezone = {
	name: 'Coordinated Universal Time — UTC, GMT',
	offset: 'UTC',
	searchIndex: 'UTC',
	hasDivider: true,
};

// Helper functions
const isValidTimezone = (tzName: string): boolean => {
	try {
		dayjs.tz(dayjs(), tzName);
		return true;
	} catch {
		return false;
	}
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
	hasDivider = false,
): Timezone => {
	const offset = formatOffset(offsetMinutes);
	return {
		name,
		offset,
		searchIndex: offset.replace(/ /g, ''),
		...(hasDivider && { hasDivider }),
	};
};

const getOffsetByTimezone = (timezone: string): number => {
	const dayjsTimezone = dayjs().tz(timezone);
	return dayjsTimezone.utcOffset();
};

const filterAndSortTimezones = (
	allTimezones: ReturnType<typeof getTimeZones>,
	browserTzName?: string,
): Timezone[] =>
	allTimezones
		.filter(
			(tz) =>
				!tz.name.startsWith('Etc/') &&
				isValidTimezone(tz.name) &&
				tz.name !== browserTzName,
		)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((tz) => createTimezoneEntry(tz.name, tz.rawOffsetInMinutes));

const generateTimezoneData = (): Timezone[] => {
	const allTimezones = getTimeZones();
	const timezones: Timezone[] = [];

	// Add browser timezone
	const browserTz = dayjs.tz.guess();
	const utcOffset = getOffsetByTimezone(browserTz);

	const browserTzObject = createTimezoneEntry(
		`Browser time — ${browserTz}`,
		utcOffset,
	);

	if (browserTzObject) {
		timezones.push(browserTzObject);
	}

	// Add UTC timezone with divider
	timezones.push(UTC_TIMEZONE);

	// Add remaining timezones
	timezones.push(...filterAndSortTimezones(allTimezones, browserTz));

	return timezones;
};

export const getTimezoneObjectByTimezoneString = (
	timezone: string,
): Timezone | null => {
	const utcOffset = getOffsetByTimezone(timezone);

	return createTimezoneEntry(timezone, utcOffset);
};

export const TIMEZONE_DATA = generateTimezoneData();
