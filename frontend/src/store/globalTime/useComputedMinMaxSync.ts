import { useEffect } from 'react';

import { GlobalTimeStoreApi } from './globalTimeStore';

/**
 * Used to keep the computed min/max in the store in sync
 *
 * @internal
 */
export function useComputedMinMaxSync(store: GlobalTimeStoreApi): void {
	useEffect(() => {
		store.getState().computeAndStoreMinMax();
	}, [store]);

	useEffect(() => {
		let previousSelectedTime = store.getState().selectedTime;

		// ensure for every change on state of the store, if selected time is different, it will call/compute min/max
		// otherwise we can have staled min max
		return store.subscribe((state) => {
			if (state.selectedTime !== previousSelectedTime) {
				previousSelectedTime = state.selectedTime;
				store.getState().computeAndStoreMinMax();
			}
		});
	}, [store]);
}
