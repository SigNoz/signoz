import { Time } from 'container/Header/DateTimeSelection/config';
import { GlobalReducer } from 'types/reducer/globalTime';

import dayjs from 'dayjs';

const GetMinMax = (
	interval: Time,
	dateTimeRange?: [number, number],
): GetMinMaxPayload => {
	let maxTime = new Date().getTime();
	let minTime = 0;

	if (interval === '1min') {
		minTime = dayjs().subtract(1, 'minute').toDate().getTime();
	} else if (interval === '15min') {
		minTime = dayjs().subtract(15, 'minute').toDate().getTime();
	} else if (interval === '1hr') {
		minTime = dayjs().subtract(1, 'hour').toDate().getTime();
	} else if (interval === '30min') {
		const minTimeAgo = dayjs().subtract(30, 'minute').toDate().getTime();
		minTime = minTimeAgo;
	} else if (interval === '5min') {
		minTime = dayjs().subtract(5, 'minute').toDate().getTime();
	} else if (interval === '1day') {
		minTime = dayjs().subtract(1, 'day').toDate().getTime();
	} else if (interval === '1week') {
		minTime = dayjs().subtract(1, 'week').toDate().getTime();
	} else if (interval === '6hr') {
		minTime = dayjs().subtract(6, 'hour').toDate().getTime();
	} else if (interval === 'custom') {
		maxTime = (dateTimeRange || [])[1] || 0;
		minTime = (dateTimeRange || [])[0] || 0;
	} else {
		throw new Error('invalid time type');
	}

	return {
		minTime: minTime,
		maxTime: maxTime,
	};
};

interface GetMinMaxPayload {
	minTime: GlobalReducer['minTime'];
	maxTime: GlobalReducer['maxTime'];
}

export default GetMinMax;
