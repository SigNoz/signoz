import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { useCallback, useEffect, useState } from 'react';
import {
	addCustomTimeRange as addRange,
	clearCustomTimeRanges as clearRanges,
	CustomTimeRange,
	getCustomTimeRanges as getRanges,
	removeCustomTimeRange as removeRange,
} from 'utils/customTimeRangeUtils';

/**
 * Custom hook for managing the last 3 used custom time ranges
 * @returns Object containing custom time ranges and management functions
 */
export const useCustomTimeRanges = (): {
	customTimeRanges: CustomTimeRange[];
	addCustomTimeRange: (dateTimeRange: DateTimeRangeType) => CustomTimeRange[];
	removeCustomTimeRange: (timestamp: number) => CustomTimeRange[];
	clearCustomTimeRanges: () => void;
	isCustomTimeRangeExists: (dateTimeRange: DateTimeRangeType) => boolean;
	refreshCustomTimeRanges: () => void;
} => {
	const [customTimeRanges, setCustomTimeRanges] = useState<CustomTimeRange[]>(
		[],
	);

	// Always get the latest data from localStorage
	const getLatestRanges = useCallback((): CustomTimeRange[] => getRanges(), []);

	// Load initial data from localStorage
	useEffect(() => {
		const ranges = getLatestRanges();
		setCustomTimeRanges(ranges);
	}, [getLatestRanges]);

	/**
	 * Adds a new custom time range to the stored list
	 * @param dateTimeRange - The DateTimeRangeType from the time picker
	 * @returns The updated list of custom time ranges
	 */
	const addCustomTimeRange = useCallback(
		(dateTimeRange: DateTimeRangeType): CustomTimeRange[] => {
			const updatedRanges = addRange(dateTimeRange);
			setCustomTimeRanges(updatedRanges);
			return updatedRanges;
		},
		[],
	);

	/**
	 * Removes a specific custom time range by its timestamp
	 * @param timestamp - The timestamp of the range to remove
	 * @returns The updated list of custom time ranges
	 */
	const removeCustomTimeRange = useCallback(
		(timestamp: number): CustomTimeRange[] => {
			const updatedRanges = removeRange(timestamp);
			setCustomTimeRanges(updatedRanges);
			return updatedRanges;
		},
		[],
	);

	/**
	 * Clears all stored custom time ranges
	 */
	const clearCustomTimeRanges = useCallback((): void => {
		clearRanges();
		setCustomTimeRanges([]);
	}, []);

	/**
	 * Checks if a time range already exists in the stored list
	 * @param dateTimeRange - The DateTimeRangeType to check
	 * @returns True if the range already exists
	 */
	const isCustomTimeRangeExists = useCallback(
		(dateTimeRange: DateTimeRangeType): boolean => {
			if (!dateTimeRange || !dateTimeRange[0] || !dateTimeRange[1]) {
				return false;
			}

			const [startTime, endTime] = dateTimeRange;
			// Always fetch latest data from localStorage
			const latestRanges = getLatestRanges();
			return latestRanges.some(
				(range) =>
					range.from === startTime.toISOString() &&
					range.to === endTime.toISOString(),
			);
		},
		[getLatestRanges],
	);

	/**
	 * Refreshes the custom time ranges from localStorage
	 * Useful when you want to sync with changes made outside the hook
	 */
	const refreshCustomTimeRanges = useCallback((): void => {
		const ranges = getLatestRanges();
		setCustomTimeRanges(ranges);
	}, [getLatestRanges]);

	return {
		customTimeRanges,
		addCustomTimeRange,
		removeCustomTimeRange,
		clearCustomTimeRanges,
		isCustomTimeRangeExists,
		refreshCustomTimeRanges,
	};
};
