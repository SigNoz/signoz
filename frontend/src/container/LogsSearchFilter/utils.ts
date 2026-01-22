import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { GetMinMaxPayload } from 'lib/getMinMax';

export const getGlobalTime = (
	selectedTime: Time | CustomTimeType,
	globalTime: GetMinMaxPayload,
): GetMinMaxPayload | undefined => {
	if (selectedTime === 'custom') {
		return undefined;
	}
	return globalTime;
};
