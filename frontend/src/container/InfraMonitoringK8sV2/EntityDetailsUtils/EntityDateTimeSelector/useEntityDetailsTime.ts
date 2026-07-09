import { useCallback, useMemo } from 'react';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import {
	createCustomTimeRange,
	isCustomTimeRange,
	NANO_SECOND_MULTIPLIER,
	useGlobalTime,
} from 'store/globalTime';

export interface EntityDetailsTimeRange {
	/** Unix timestamp in seconds — the unit API payload builders expect. Multiply by 1000 for ms-based UI (modals, URL params). */
	startTime: number;
	/** Unix timestamp in seconds — the unit API payload builders expect. Multiply by 1000 for ms-based UI (modals, URL params). */
	endTime: number;
}

export interface UseEntityDetailsTimeResult {
	/** Time range in seconds */
	timeRange: EntityDetailsTimeRange;
	selectedInterval: Time;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	handleResetToParentTime: () => boolean;
	canResetToParent: boolean;
	hasTimeChanged: boolean;
}

export function useEntityDetailsTime(): UseEntityDetailsTimeResult {
	const selectedTime = useGlobalTime((s) => s.selectedTime);
	const lastComputedMinMax = useGlobalTime((s) => s.lastComputedMinMax);
	const setSelectedTime = useGlobalTime((s) => s.setSelectedTime);
	const handleResetToParentTime = useGlobalTime((s) => s.resetToParentTime);
	const parentStore = useGlobalTime((s) => s.parentStore);

	const canResetToParent = !!parentStore;

	const hasTimeChanged = useMemo(() => {
		if (!parentStore) {
			return false;
		}
		return selectedTime !== parentStore.getState().selectedTime;
	}, [parentStore, selectedTime]);

	const timeRange = useMemo<EntityDetailsTimeRange>(
		() => ({
			startTime: Math.floor(
				lastComputedMinMax.minTime / NANO_SECOND_MULTIPLIER / 1000,
			),
			endTime: Math.floor(
				lastComputedMinMax.maxTime / NANO_SECOND_MULTIPLIER / 1000,
			),
		}),
		[lastComputedMinMax],
	);

	const selectedInterval = useMemo<Time>(
		() =>
			isCustomTimeRange(selectedTime)
				? ('custom' as Time)
				: (selectedTime as Time),
		[selectedTime],
	);

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			if (interval === 'custom' && dateTimeRange) {
				// DateTimeSelector delivers milliseconds; the store keys custom
				// ranges by nanoseconds.
				setSelectedTime(
					createCustomTimeRange(
						dateTimeRange[0] * NANO_SECOND_MULTIPLIER,
						dateTimeRange[1] * NANO_SECOND_MULTIPLIER,
					),
				);
			} else {
				setSelectedTime(interval as Time);
			}
		},
		[setSelectedTime],
	);

	return {
		timeRange,
		selectedInterval,
		handleTimeChange,
		handleResetToParentTime,
		canResetToParent,
		hasTimeChanged,
	};
}
