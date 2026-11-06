import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';

import { formatTime, formatTimestampOmittingTodaysDate } from '../timeUtils';

describe('formatTime', () => {
	it.each([
		[45, '45.0s'],
		[90, '1.5m'],
		[5400, '1.5h'],
		[129600, '1.5d'],
	])('formats %s seconds as %s', (seconds, expected) => {
		expect(formatTime(seconds)).toBe(expected);
	});

	it.each([
		[59.96, '1.0m'],
		[3597, '1.0h'],
		[86300, '1.0d'],
	])(
		'moves %s seconds up a unit once it rounds to the next one (%s)',
		(seconds, expected) => {
			expect(formatTime(seconds)).toBe(expected);
		},
	);

	it('keeps values just below the rounding edge in the smaller unit', () => {
		expect(formatTime(59.94)).toBe('59.9s');
		expect(formatTime(3594)).toBe('59.9m');
		expect(formatTime(86000)).toBe('23.9h');
	});

	it('returns a dash for non-numeric input', () => {
		expect(formatTime(Number.NaN)).toBe('-');
	});
});

describe('formatTimestampOmittingTodaysDate', () => {
	const timezone = 'Asia/Kolkata';

	it('drops the date for a point on the current day', () => {
		const now = dayjs().tz(timezone);

		expect(formatTimestampOmittingTodaysDate(now.valueOf(), timezone)).toBe(
			now.format(DATE_TIME_FORMATS.TIME_SECONDS),
		);
	});

	it('keeps the date for a point on any other day', () => {
		const yesterday = dayjs().tz(timezone).subtract(1, 'day');

		expect(formatTimestampOmittingTodaysDate(yesterday.valueOf(), timezone)).toBe(
			yesterday.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS),
		);
	});

	it('honours an explicit format over the day check', () => {
		const now = dayjs().tz(timezone);

		expect(
			formatTimestampOmittingTodaysDate(
				now.valueOf(),
				timezone,
				DATE_TIME_FORMATS.ISO_DATETIME_SECONDS,
			),
		).toBe(now.format(DATE_TIME_FORMATS.ISO_DATETIME_SECONDS));
	});
});
