import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';

import getMicroSeconds from './getMicroSeconds';
import getMinAgo from './getMinAgo';

const calculateStartAndEndTime = (
	minutes: number,
	endString: string,
): Payload => {
	const agodate = getMinAgo({ minutes }).getTime();
	const agoString = getMicroSeconds({ time: agodate });

	return {
		start: agoString,
		end: endString,
	};
};

const GetStartAndEndTime = ({
	type,
	minTime,
	maxTime,
}: GetStartAndEndTimeProps): Payload => {
	const end = new Date().getTime();
	const endString = getMicroSeconds({ time: end });

	if (type === 'LAST_5_MIN') {
		return calculateStartAndEndTime(5, endString);
	}

	if (type === 'LAST_30_MIN') {
		return calculateStartAndEndTime(30, endString);
	}

	if (type === 'LAST_1_HR') {
		return calculateStartAndEndTime(60, endString);
	}

	if (type === 'LAST_15_MIN') {
		return calculateStartAndEndTime(15, endString);
	}

	if (type === 'LAST_6_HR') {
		return calculateStartAndEndTime(6 * 60, endString);
	}

	if (type === 'LAST_1_DAY') {
		return calculateStartAndEndTime(24 * 60, endString);
	}

	if (type === 'LAST_3_DAYS') {
		return calculateStartAndEndTime(24 * 60 * 3, endString);
	}

	if (type === 'LAST_1_WEEK') {
		return calculateStartAndEndTime(24 * 60 * 7, endString);
	}

	if (type === 'LAST_1_MONTH') {
		return calculateStartAndEndTime(24 * 60 * 30, endString);
	}

	return {
		start: getMicroSeconds({ time: minTime / 1000000 }),
		end: getMicroSeconds({ time: maxTime / 1000000 }),
	};
};

interface GetStartAndEndTimeProps {
	type: timePreferenceType;
	minTime: number;
	maxTime: number;
}

interface Payload {
	start: string;
	end: string;
}

export default GetStartAndEndTime;
