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

	if (type === 'LAST_15_MIN') {
		const agodate = getMinAgo({ minutes: 15 }).getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	return {
		start: getMicroSeconds({ time: minTime / 10000000 }),
		end: getMicroSeconds({ time: maxTime / 10000000 }),
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
