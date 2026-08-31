import { useMemo } from 'react';
import {
	NANO_SECOND_MULTIPLIER,
	useLastComputedMinMax,
} from 'store/globalTime';

import { QuickFilterCheckboxUseFieldApis } from '../types';

/**
 * Builds the `useFieldApis` config for a signal quick-filter page.
 * if existingQuery is sent null, related values are not fetched
 */
export function useSignalFieldApis(): QuickFilterCheckboxUseFieldApis {
	const { minTime, maxTime } = useLastComputedMinMax();

	return useMemo(
		() => ({
			startUnixMilli: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
			endUnixMilli: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
			existingQuery: null,
		}),
		[minTime, maxTime],
	);
}
