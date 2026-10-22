import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';

import { formatTimestampOmittingTodaysDate } from '../timeUtils';

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
