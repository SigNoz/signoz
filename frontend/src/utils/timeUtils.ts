import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';

dayjs.extend(customParseFormat);

dayjs.extend(duration);

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

/**
 * Calculates the duration from the given epoch timestamp to the current time.
 *
 *
 * @param {number} epochTimestamp
 * @returns {string} - human readable string representing the duration from the given epoch timestamp to the current time e.g. "3d 14h"
 */
export const getDurationFromNow = (epochTimestamp: number): string => {
	const now = dayjs();
	const inputTime = dayjs(epochTimestamp);
	const duration = dayjs.duration(now.diff(inputTime));

	const days = duration.days();
	const hours = duration.hours();
	const minutes = duration.minutes();
	const seconds = duration.seconds();

	let result = '';
	if (days > 0) result += `${days}d `;
	if (hours > 0) result += `${hours}h `;
	if (minutes > 0) result += `${minutes}m `;
	if (seconds > 0) result += `${seconds}s`;

	return result.trim();
};

/**
 * Formats an epoch timestamp into a human-readable date and time string.
 *
 * @param {number} epoch - The epoch timestamp to format.
 * @returns {string} - The formatted date and time string in the format "MMM D, YYYY ⎯ HH:MM:SS".
 */
export function formatEpochTimestamp(epoch: number): string {
	const date = new Date(epoch * 1000);

	const optionsDate: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	};

	const optionsTime: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	};

	const formattedDate = date.toLocaleDateString('en-US', optionsDate);
	const formattedTime = date.toLocaleTimeString('en-US', optionsTime);

	return `${formattedDate} ⎯ ${formattedTime}`;
}
