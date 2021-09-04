import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import store from 'store';

import getMicroSeconds from './getMicroSeconds';
import getMinAgo from './getMinAgo';

const getStartAndEndTime = ({ type }: GetStartAndEndTimeProps): Payload => {
	const end = new Date().getTime();
	const endString = getMicroSeconds({ time: end });
	const { globalTime } = store.getState();

	if (type === 'LAST_15_MIN') {
		const agodate = getMinAgo({ minutes: 15 }).getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	return {
		start: globalTime.minTime.toString(),
		end: globalTime.maxTime.toString(),
	};
};

interface GetStartAndEndTimeProps {
	type: timePreferenceType;
}

interface Payload {
	start: string;
	end: string;
}

export default getStartAndEndTime;
