import { useMemo } from 'react';
import { NANO_SECOND_MULTIPLIER, useGlobalTime } from 'store/globalTime';

import { K8sEventsTimeRange } from './types';

/**
 * The cluster-wide list follows the page-level time picker, unlike the entity
 * drawer which keeps a time range of its own.
 */
export function useK8sEventsTimeRange(): K8sEventsTimeRange {
	const lastComputedMinMax = useGlobalTime((s) => s.lastComputedMinMax);

	return useMemo(
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
}
