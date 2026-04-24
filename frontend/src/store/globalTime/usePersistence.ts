import { useEffect } from 'react';

import set from 'api/browser/localstorage/set';

import { GlobalTimeStoreApi } from './globalTimeStore';

export function usePersistence(
	store: GlobalTimeStoreApi,
	persistKey: string | undefined,
): void {
	useEffect(() => {
		if (!persistKey) {
			return;
		}

		let previousSelectedTime = store.getState().selectedTime;

		return store.subscribe((state) => {
			if (state.selectedTime === previousSelectedTime) {
				return;
			}
			previousSelectedTime = state.selectedTime;

			set(persistKey, state.selectedTime);
		});
	}, [store, persistKey]);
}
