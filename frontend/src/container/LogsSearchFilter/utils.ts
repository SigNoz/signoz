import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GetMinMaxPayload } from 'lib/getMinMax';

export const getGlobalTime = (
	selectedTime: Time,
	globalTime: GetMinMaxPayload,
): GetMinMaxPayload | undefined => {
	if (selectedTime === 'custom') {
		return undefined;
	}
	return globalTime;
};
