import { Time } from 'container/Header/DateTimeSelection/config';
import dayjs from 'dayjs';
import { GlobalTime } from 'types/actions/globalTime';

export const getStartTime = (time: Time, globalTime: GlobalTime) => {
	if (time === 'custom') {
		const startjs = dayjs(globalTime.minTime / 1000000);
		const endjs = dayjs(globalTime.maxTime / 1000000);

		const diff = endjs.diff(startjs, 'minute');

		if (diff === 1) {
			// add 15 min
			const updatedStartjs = dayjs(endjs).add(15, 'minute').toDate().getTime();
			const updatedEndjs = dayjs(startjs)
				.subtract(15, 'minute')
				.toDate()
				.getTime();

			return { min: updatedEndjs * 1000000, max: updatedStartjs * 1000000 };
		} else {
			return { min: globalTime.minTime, max: globalTime.maxTime };
		}
	}
	return { min: globalTime.minTime, max: globalTime.maxTime };
};
