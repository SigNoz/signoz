import dayjs, { Dayjs } from 'dayjs';

export function getDiffs(lastRefresh: Dayjs): { [key: string]: number } {
	const currentTime = dayjs();
	const secondsDiff = currentTime.diff(lastRefresh, 'seconds');
	const minutedDiff = currentTime.diff(lastRefresh, 'minutes');
	const hoursDiff = currentTime.diff(lastRefresh, 'hours');
	const daysDiff = currentTime.diff(lastRefresh, 'days');
	const weekDiff = currentTime.diff(lastRefresh, 'week');
	const weekDiffFloat = currentTime.diff(lastRefresh, 'week', true);
	const daysDiffFloat = currentTime.diff(lastRefresh, 'days', true);
	const monthsDiff = currentTime.diff(lastRefresh, 'months');
	return {
		secondsDiff,
		minutedDiff,
		hoursDiff,
		daysDiff,
		monthsDiff,
		weekDiff,
		weekDiffFloat,
		daysDiffFloat,
	};
}
