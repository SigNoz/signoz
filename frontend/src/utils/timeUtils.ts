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

export const getRemainingDays = (billingEndDate: number): number => {
	// Convert Epoch timestamps to Date objects
	const startDate = new Date(); // Convert seconds to milliseconds
	const endDate = new Date(billingEndDate * 1000); // Convert seconds to milliseconds

	// Calculate the time difference in milliseconds
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const timeDifference = endDate - startDate;

	return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
};
