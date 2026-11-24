import dayjs from 'dayjs';

/** Week rows the calendar renders for `month`, with weeks starting on Sunday. */
export function getCalendarWeekCount(month: Date | undefined): number {
	const firstDay = dayjs(month).startOf('month');

	return Math.ceil((firstDay.day() + firstDay.daysInMonth()) / 7);
}
