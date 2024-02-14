import { Time } from 'container/TopNav/DateTimeSelection/config';
import { Time as TimeV2 } from 'container/TopNav/DateTimeSelectionV2/config';
import { GetMinMaxPayload } from 'lib/getMinMax';

export const getGlobalTime = (
	selectedTime: Time | TimeV2,
	globalTime: GetMinMaxPayload,
): GetMinMaxPayload | undefined => {
	if (selectedTime === 'custom') {
		return undefined;
	}
	return globalTime;
};
