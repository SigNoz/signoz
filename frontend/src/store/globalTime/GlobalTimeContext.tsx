import {
	// oxlint-disable-next-line no-restricted-imports
	createContext,
	ReactNode,
	// oxlint-disable-next-line no-restricted-imports
	useContext,
	useState,
} from 'react';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

import get from 'api/browser/localstorage/get';

import {
	createGlobalTimeStore,
	defaultGlobalTimeStore,
	GlobalTimeStoreApi,
} from './globalTimeStore';
import { GlobalTimeProviderOptions, GlobalTimeSelectedTime } from './types';
import { usePersistence } from './usePersistence';
import { useQueryCacheSync } from './useQueryCacheSync';
import { useUrlSync } from './useUrlSync';
import { useComputedMinMaxSync } from 'store/globalTime/useComputedMinMaxSync';

export const GlobalTimeContext = createContext<GlobalTimeStoreApi | null>(null);

export function GlobalTimeProvider({
	children,
	name,
	inheritGlobalTime = false,
	initialTime,
	enableUrlParams = false,
	removeQueryParamsOnUnmount = false,
	localStoragePersistKey,
	refreshInterval: initialRefreshInterval,
}: GlobalTimeProviderOptions & { children: ReactNode }): JSX.Element {
	const parentStore = useContext(GlobalTimeContext);
	const globalStore = parentStore ?? defaultGlobalTimeStore;

	const resolveInitialTime = (): GlobalTimeSelectedTime => {
		if (inheritGlobalTime) {
			return globalStore.getState().selectedTime;
		}
		if (localStoragePersistKey) {
			const stored = get(localStoragePersistKey);
			if (stored) {
				return stored as GlobalTimeSelectedTime;
			}
		}
		return initialTime ?? DEFAULT_TIME_RANGE;
	};

	// Create isolated store (stable reference)
	const [store] = useState(() =>
		createGlobalTimeStore({
			name,
			selectedTime: resolveInitialTime(),
			refreshInterval: initialRefreshInterval ?? 0,
		}),
	);

	useComputedMinMaxSync(store);
	useQueryCacheSync(store);
	useUrlSync(store, enableUrlParams, removeQueryParamsOnUnmount);
	usePersistence(store, localStoragePersistKey);

	return (
		<GlobalTimeContext.Provider value={store}>
			{children}
		</GlobalTimeContext.Provider>
	);
}
