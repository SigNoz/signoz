import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GlobalReducer } from 'types/reducer/globalTime';

import getMinAgo from './getStartAndEndTime/getMinAgo';

const GetMinMax = (
	interval: Time,
	dateTimeRange?: [number, number],
): GetMinMaxPayload => {
	let maxTime = new Date().getTime();
	let minTime = 0;

	if (interval === '1min') {
		const minTimeAgo = getMinAgo({ minutes: 1 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '10min') {
		const minTimeAgo = getMinAgo({ minutes: 10 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '15min') {
		const minTimeAgo = getMinAgo({ minutes: 15 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '1hr') {
		const minTimeAgo = getMinAgo({ minutes: 60 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '30min') {
		const minTimeAgo = getMinAgo({ minutes: 30 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '5min') {
		const minTimeAgo = getMinAgo({ minutes: 5 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '1day') {
		// one day = 24*60(min)
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '1week') {
		// one week = one day * 7
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 7 }).getTime();
		minTime = minTimeAgo;
	} else if (['4hr', '6hr'].includes(interval)) {
		const h = parseInt(interval.replace('hr', ''), 10);
		const minTimeAgo = getMinAgo({ minutes: h * 60 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === 'custom') {
		maxTime = (dateTimeRange || [])[1] || 0;
		minTime = (dateTimeRange || [])[0] || 0;
	} else {
		throw new Error('invalid time type');
	}

	return {
		minTime: minTime * 1000000,
		maxTime: maxTime * 1000000,
	};
};

export interface GetMinMaxPayload {
	minTime: GlobalReducer['minTime'];
	maxTime: GlobalReducer['maxTime'];
}

export default GetMinMax;
