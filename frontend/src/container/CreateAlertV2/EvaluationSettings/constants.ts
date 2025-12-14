import { generateTimezoneData } from 'components/CustomTimePicker/timezoneUtils';

export const EVALUATION_WINDOW_TYPE = [
	{ label: 'Rolling', value: 'rolling' },
	{ label: 'Cumulative', value: 'cumulative' },
];

export const EVALUATION_WINDOW_TIMEFRAME = {
	rolling: [
		{ label: 'Last 5 minutes', value: '5m0s' },
		{ label: 'Last 10 minutes', value: '10m0s' },
		{ label: 'Last 15 minutes', value: '15m0s' },
		{ label: 'Last 30 minutes', value: '30m0s' },
		{ label: 'Last 1 hour', value: '1h0m0s' },
		{ label: 'Last 2 hours', value: '2h0m0s' },
		{ label: 'Last 4 hours', value: '4h0m0s' },
		{ label: 'Custom', value: 'custom' },
	],
	cumulative: [
		{ label: 'Current hour', value: 'currentHour' },
		{ label: 'Current day', value: 'currentDay' },
		{ label: 'Current month', value: 'currentMonth' },
	],
};

export const EVALUATION_CADENCE_REPEAT_EVERY_OPTIONS = [
	{ label: 'DAY', value: 'day' },
	{ label: 'WEEK', value: 'week' },
	{ label: 'MONTH', value: 'month' },
];

export const EVALUATION_CADENCE_REPEAT_EVERY_WEEK_OPTIONS = [
	{ label: 'SUNDAY', value: 'sunday' },
	{ label: 'MONDAY', value: 'monday' },
	{ label: 'TUESDAY', value: 'tuesday' },
	{ label: 'WEDNESDAY', value: 'wednesday' },
	{ label: 'THURSDAY', value: 'thursday' },
	{ label: 'FRIDAY', value: 'friday' },
	{ label: 'SATURDAY', value: 'saturday' },
];

export const EVALUATION_CADENCE_REPEAT_EVERY_MONTH_OPTIONS = Array.from(
	{ length: 31 },
	(_, i) => {
		const value = String(i + 1);
		return { label: value, value };
	},
);

export const WEEKDAY_MAP: { [key: string]: number } = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

export const TIMEZONE_DATA = generateTimezoneData().map((timezone) => ({
	label: `${timezone.name} (${timezone.offset})`,
	value: timezone.value,
}));

export const CUMULATIVE_WINDOW_DESCRIPTION =
	'A Cumulative Window has a fixed starting point and expands over time.';

export const ROLLING_WINDOW_DESCRIPTION =
	'A Rolling Window has a fixed size and shifts its starting point over time based on when the rules are evaluated.';
