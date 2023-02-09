import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GlobalReducer } from 'types/reducer/globalTime';

import getMinAgo from './getStartAndEndTime/getMinAgo';

const GetMinMax = (
	interval: Time,
	dateTimeRange?: [number, number],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): GetMinMaxPayload => {
	let maxTime = new Date().getTime();
	let minTime = 0;
	if (interval === 'queried') {
		minTime = (dateTimeRange || [])[1] || 0;
	} else if (interval === '1min') {
		minTime = getMinAgo({ minutes: 1 }).getTime();
	} else if (interval === '10min') {
		minTime = getMinAgo({ minutes: 10 }).getTime();
	} else if (interval === '15min') {
		minTime = getMinAgo({ minutes: 15 }).getTime();
	} else if (interval === '1hr') {
		minTime = getMinAgo({ minutes: 60 }).getTime();
	} else if (interval === '30min') {
		minTime = getMinAgo({ minutes: 30 }).getTime();
	} else if (interval === '5min') {
		minTime = getMinAgo({ minutes: 5 }).getTime();
	} else if (interval === '1day') {
		// one day = 24*60(min)
		minTime = getMinAgo({ minutes: 24 * 60 }).getTime();
	} else if (interval === '1week') {
		// one week = one day * 7
		minTime = getMinAgo({ minutes: 24 * 60 * 7 }).getTime();
	} else if (['4hr', '6hr'].includes(interval)) {
		const h = parseInt(interval.replace('hr', ''), 10);
		minTime = getMinAgo({ minutes: h * 60 }).getTime();
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
