import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export function toUTCEpoch(time: number): number {
	const x = new Date();
	return time + x.getTimezoneOffset() * 60 * 1000;
}

export const getFormattedDate = (epochTimestamp: number): string => {
	// Convert epoch timestamp to a date
	const date = dayjs.unix(epochTimestamp);

	// Format the date as "18 Nov 2013"
	return date.format('DD MMM YYYY');
};
