import { getTimeZones } from '@vvo/tzdb';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

interface Timezone {
	name: string;
	offset: string;
	hasDivider?: boolean;
}

// Constants
const UTC_TIMEZONE: Timezone = {
	name: 'Coordinated Universal Time — UTC, GMT',
	offset: 'UTC',
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

	return `UTC ${sign}${hours}${
		minutes ? `:${minutes.toString().padStart(2, '0')}` : ':00'
	}`;
};

const createTimezoneEntry = (
	name: string,
	offsetMinutes: number,
	hasDivider = false,
): Timezone => ({
	name,
	offset: formatOffset(offsetMinutes),
	...(hasDivider && { hasDivider }),
});

const getBrowserTimezone = (
	allTimezones: ReturnType<typeof getTimeZones>,
): Timezone | null => {
	const browserTz = dayjs.tz.guess();
	const browserTimezone = allTimezones.find((tz) => tz.name === browserTz);

	if (!browserTimezone) return null;

	return createTimezoneEntry(
		`Browser time — ${browserTimezone.name}`,
		browserTimezone.rawOffsetInMinutes,
	);
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

	// Add browser timezone if available
	const browserTz = getBrowserTimezone(allTimezones);
	if (browserTz) {
		timezones.push(browserTz);
	}

	// Add UTC timezone with divider
	timezones.push(UTC_TIMEZONE);

	// Add remaining timezones
	timezones.push(...filterAndSortTimezones(allTimezones, browserTz?.name[1]));

	return timezones;
};

export const TIMEZONE_DATA = generateTimezoneData();
