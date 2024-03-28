import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import store from 'store';

import getMaxMinTime from './getMaxMinTime';
import getMinMax from './getMinMax';
import getStartAndEndTime from './getStartAndEndTime';

const getStartEndRangeTime = ({
	type = 'GLOBAL_TIME',
	graphType = null,
	interval = 'custom',
}: GetStartEndRangeTimesProps): GetStartEndRangeTimesPayload => {
	const { globalTime } = store.getState();

	const minMax = getMinMax(interval, [
		globalTime.minTime / 1000000,
		globalTime.maxTime / 1000000,
	]);

	const maxMinTime = getMaxMinTime({
		graphType,
		maxTime: minMax.maxTime,
		minTime: minMax.minTime,
	});

	const { end, start } = getStartAndEndTime({
		type,
		maxTime: maxMinTime.maxTime,
		minTime: maxMinTime.minTime,
	});

	return { start, end };
};

interface GetStartEndRangeTimesProps {
	type?: timePreferenceType;
	graphType?: PANEL_TYPES | null;
	interval?: Time | TimeV2 | CustomTimeType;
}

interface GetStartEndRangeTimesPayload {
	start: string;
	end: string;
}

export default getStartEndRangeTime;
