import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { validateTimeRange } from 'utils/timeUtils';

const FORMAT = DATE_TIME_FORMATS.UK_DATETIME_SECONDS;
const TIMEZONE = 'Africa/Lagos';

const inTimezone = (offsetMinutes: number): string =>
	dayjs().tz(TIMEZONE).subtract(offsetMinutes, 'minute').format(FORMAT);

describe('validateTimeRange', () => {
	it('accepts a well formed past range', () => {
		const result = validateTimeRange(
			inTimezone(120),
			inTimezone(60),
			FORMAT,
			TIMEZONE,
		);

		expect(result.isValid).toBe(true);
		expect(result.startTimeMs).toBeLessThan(result.endTimeMs as number);
	});

	it.each([
		['missing seconds', '10/08/2026 14:30'],
		['date only', '10/08/2026'],
		['empty string', ''],
		['unparseable text', 'garbage'],
		['truncated minutes', '10/08/2026 14:3'],
	])('rejects %s without throwing', (_label, startTime) => {
		let result;

		expect(() => {
			result = validateTimeRange(startTime, inTimezone(60), FORMAT, TIMEZONE);
		}).not.toThrow();

		expect(result).toMatchObject({
			isValid: false,
			errorDetails: { code: 'INVALID_DATE_TIME_FORMAT' },
		});
	});

	it('rejects a missing end time instead of defaulting it to now', () => {
		const result = validateTimeRange(
			inTimezone(60),
			undefined as unknown as string,
			FORMAT,
			TIMEZONE,
		);

		expect(result.isValid).toBe(false);
		expect(result.errorDetails?.code).toBe('INVALID_DATE_TIME_FORMAT');
	});

	it('rejects future dates', () => {
		const result = validateTimeRange(
			inTimezone(-120),
			inTimezone(-60),
			FORMAT,
			TIMEZONE,
		);

		expect(result.isValid).toBe(false);
		expect(result.errorDetails?.code).toBe('DATES_IN_THE_FUTURE');
	});

	it('rejects a range where start is not before end', () => {
		const result = validateTimeRange(
			inTimezone(60),
			inTimezone(120),
			FORMAT,
			TIMEZONE,
		);

		expect(result.isValid).toBe(false);
		expect(result.errorDetails?.code).toBe('START_TIME_AFTER_END_TIME');
	});
});
