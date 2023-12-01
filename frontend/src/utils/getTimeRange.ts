import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import store from 'store';

export const getTimeRange = (): Record<string, number> => {
	const { globalTime } = store.getState();

	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: globalTime.selectedTime,
	});

	return {
		startTime: (parseInt(start, 10) * 1e3) / 1000,
		endTime: (parseInt(end, 10) * 1e3) / 1000,
	};
};
