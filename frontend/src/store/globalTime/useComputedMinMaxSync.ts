import { useEffect } from 'react';

import { GlobalTimeStoreApi } from './globalTimeStore';

export function useComputedMinMaxSync(store: GlobalTimeStoreApi): void {
	useEffect(() => {
		store.getState().computeAndStoreMinMax();
	}, [store]);

	useEffect(() => {
		let previousSelectedTime = store.getState().selectedTime;

		return store.subscribe((state) => {
			if (state.selectedTime !== previousSelectedTime) {
				previousSelectedTime = state.selectedTime;
				store.getState().computeAndStoreMinMax();
			}
		});
	}, [store]);
}
