import { getCalendarWeekCount } from '../calendarUtils';

describe('getCalendarWeekCount', () => {
	it.each([
		['February 2026', new Date(2026, 1, 14), 4],
		['January 2024', new Date(2024, 0, 31), 5],
		['June 2024', new Date(2024, 5, 1), 6],
	])('counts the week rows of %s', (_month, date, weeks) => {
		expect(getCalendarWeekCount(date)).toBe(weeks);
	});
});
