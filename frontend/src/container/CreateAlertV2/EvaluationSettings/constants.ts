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

export const getCumulativeWindowDescription = (timeframe?: string): string => {
	let example = '';
	switch (timeframe) {
		case 'currentHour':
			example =
				'An hourly cumulative window for error count alerts when errors exceed 100. Starting at the top of the hour, it tracks: 20 errors by :15, 55 by :30, 105 by :45 (alert fires).';
			break;
		case 'currentDay':
			example =
				'A daily cumulative window for sales alerts when total revenue exceeds $10,000. Starting at midnight, it tracks: $2,000 by 9 AM, $5,500 by noon, $11,000 by 3 PM (alert fires).';
			break;
		case 'currentMonth':
			example =
				'A monthly cumulative window for expense alerts when spending exceeds $50,000. Starting on the 1st, it tracks: $15,000 by the 7th, $32,000 by the 15th, $51,000 by the 22nd (alert fires).';
			break;
		default:
			example = '';
	}
	return `Monitors data accumulated since a fixed starting point. The window grows over time, keeping all historical data from the start.\n\nExample: ${example}`;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const getRollingWindowDescription = (duration?: string): string => {
	let timeWindow = '5-minute';
	let examples = '14:01:00-14:06:00, 14:02:00-14:07:00';

	if (duration) {
		const match = duration.match(/^(\d+)([mhs])/);
		if (match) {
			const value = parseInt(match[1], 10);
			const unit = match[2];

			if (unit === 'm' && !Number.isNaN(value)) {
				timeWindow = `${value}-minute`;
				const endMinutes1 = 1 + value;
				const endMinutes2 = 2 + value;
				examples = `14:01:00-14:${String(endMinutes1).padStart(
					2,
					'0',
				)}:00, 14:02:00-14:${String(endMinutes2).padStart(2, '0')}:00`;
			} else if (unit === 'h' && !Number.isNaN(value)) {
				timeWindow = `${value}-hour`;
				const endHour1 = 14 + value;
				const endHour2 = 14 + value;
				examples = `14:00:00-${String(endHour1).padStart(
					2,
					'0',
				)}:00:00, 14:01:00-${String(endHour2).padStart(2, '0')}:01:00`;
			} else if (unit === 's' && !Number.isNaN(value)) {
				timeWindow = `${value}-second`;
				examples = `14:01:00-14:01:${String(value).padStart(
					2,
					'0',
				)}, 14:01:01-14:01:${String(1 + value).padStart(2, '0')}`;
			}
		} else if (duration === 'custom') {
			timeWindow = '5-minute';
			examples = '14:01:00-14:06:00, 14:02:00-14:07:00';
		} else if (duration.includes('h')) {
			const hours = parseInt(duration, 10);
			if (!Number.isNaN(hours)) {
				timeWindow = `${hours}-hour`;
				const endHour = 14 + hours;
				examples = `14:00:00-${String(endHour).padStart(
					2,
					'0',
				)}:00:00, 14:01:00-${String(endHour).padStart(2, '0')}:01:00`;
			}
		} else if (duration.includes('m')) {
			const minutes = parseInt(duration, 10);
			if (!Number.isNaN(minutes)) {
				timeWindow = `${minutes}-minute`;
				const endMinutes1 = 1 + minutes;
				const endMinutes2 = 2 + minutes;
				examples = `14:01:00-14:${String(endMinutes1).padStart(
					2,
					'0',
				)}:00, 14:02:00-14:${String(endMinutes2).padStart(2, '0')}:00`;
			}
		}
	}

	return `Monitors data over a fixed time period that moves forward continuously.\n\nExample: A ${timeWindow} rolling window for error rate alerts with 1 minute evaluation cadence. Unlike fixed windows, this checks continuously: ${examples}, etc.`;
};
