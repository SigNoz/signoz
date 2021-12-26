import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import dayjs from 'dayjs';

import getMicroSeconds from './getMicroSeconds';

const GetStartAndEndTime = ({
	type,
	minTime,
	maxTime,
}: GetStartAndEndTimeProps): Payload => {
	const end = new Date().getTime();
	const endString = getMicroSeconds({ time: end });

	if (type === 'LAST_5_MIN') {
		const agodate = dayjs().subtract(5, 'minute').toDate().getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_30_MIN') {
		const agodate = dayjs().subtract(30, 'minute').toDate().getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_1_HR') {
		const agodate = dayjs().subtract(60, 'minute').toDate().getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_15_MIN') {
		const agodate = dayjs().subtract(15, 'minute').toDate().getTime();
		const agoString = getMicroSeconds({ time: agodate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_6_HR') {
		const agoDate = dayjs().subtract(6, 'hour').toDate().getTime();
		const agoString = getMicroSeconds({ time: agoDate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_1_DAY') {
		const agoDate = dayjs().subtract(1, 'day').toDate().getTime();
		const agoString = getMicroSeconds({ time: agoDate });

		return {
			start: agoString,
			end: endString,
		};
	}

	if (type === 'LAST_1_WEEK') {
		const agoDate = dayjs().subtract(1, 'week').toDate().getTime();
		const agoString = getMicroSeconds({ time: agoDate });

		return {
			start: agoString,
			end: endString,
		};
	}

	return {
		start: String(minTime),
		end: String(maxTime),
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
