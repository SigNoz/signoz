import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';

import getMicroSeconds from './getMicroSeconds';
import getMinAgo from './getMinAgo';

const GetStartAndEndTime = ({
	type,
	minTime,
	maxTime,
}: GetStartAndEndTimeProps): Payload => {
	const end = new Date().getTime();
	const endString = getMicroSeconds({ time: end });

	if (type === 'LAST_5_MIN') {
		const agodate = getMinAgo({ minutes: 5 }).getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_30_MIN') {
		const agodate = getMinAgo({ minutes: 30 }).getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_1_HR') {
		const agodate = getMinAgo({ minutes: 60 }).getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_15_MIN') {
		const agodate = getMinAgo({ minutes: 15 }).getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_6_HR') {
		const agoDate = getMinAgo({ minutes: 6 * 60 }).getTime();
		const agoString = getMicroSeconds({ time: agoDate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_1_DAY') {
		const agoDate = getMinAgo({ minutes: 24 * 60 }).getTime();
		const agoString = getMicroSeconds({ time: agoDate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_1_WEEK') {
		const agoDate = getMinAgo({ minutes: 24 * 60 * 7 }).getTime();
		const agoString = getMicroSeconds({ time: agoDate });

		return {
			start: agoString,
			end: endString,
		};
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
