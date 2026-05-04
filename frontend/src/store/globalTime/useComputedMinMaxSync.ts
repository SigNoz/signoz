import { useEffect } from 'react';

import { GlobalTimeStoreApi } from './globalTimeStore';

/**
 * Used to initialize computed min/max on mount when store has no values yet.
 * setSelectedTime now computes min/max on change, so subscription is no longer needed.
 *
 * @internal
 */
export function useComputedMinMaxSync(store: GlobalTimeStoreApi): void {
	useEffect(() => {
		const { lastComputedMinMax } = store.getState();
		if (lastComputedMinMax.minTime === 0 && lastComputedMinMax.maxTime === 0) {
			store.getState().computeAndStoreMinMax();
		}
	}, [store]);
}
