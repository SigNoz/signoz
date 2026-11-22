import { Query, QueryClient, QueryKey } from 'react-query';
import { persistQueryClient } from 'react-query/persistQueryClient-experimental';
import { createWebStoragePersistor } from 'react-query/createWebStoragePersistor-experimental';
import getLocalStorageApi from 'api/browser/localstorage/get';
import removeLocalStorageApi from 'api/browser/localstorage/remove';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { getGetGlobalConfigQueryKey } from 'api/generated/services/global';
import { getGetActiveLicenseQueryKey } from 'api/generated/services/licenses';
import { getGetMyUserQueryKey } from 'api/generated/services/users';
import { getGetHostsQueryKey } from 'api/generated/services/zeus';
import { LOCALSTORAGE } from 'constants/localStorage';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	IsAdminPermission,
	IsEditorPermission,
	IsViewerPermission,
} from 'lib/authz/hooks/useAuthZ/legacy';

import { clearBootQueryCache } from './clear';

// Bump when the shape of a persisted response changes.
const BUSTER = '1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const BOOT_QUERY_KEYS: QueryKey[] = [
	getGetGlobalConfigQueryKey(),
	getGetMyUserQueryKey(),
	getGetActiveLicenseQueryKey(),
	getGetHostsQueryKey(),
	[REACT_QUERY_KEY.GET_FEATURES_FLAGS],
	['getAllUserPreferences', 'app-context'],
	['getOrgPreferences', 'app-context'],
	['authz', IsAdminPermission],
	['authz', IsEditorPermission],
	['authz', IsViewerPermission],
];

const BOOT_QUERY_HASHES = new Set(
	BOOT_QUERY_KEYS.map((key) => JSON.stringify(key)),
);

const isBootQuery = (query: Query): boolean =>
	BOOT_QUERY_HASHES.has(JSON.stringify(query.queryKey));

const isLoggedIn = (): boolean =>
	getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN) === 'true';

// Writes are dropped once logged out, so a save throttled from before a logout
// cannot write the old session back.
const storage: Storage = {
	get length(): number {
		return 0;
	},
	clear: (): void => undefined,
	key: (): string | null => null,
	getItem: (key): string | null => getLocalStorageApi(key),
	setItem: (key, value): void => {
		if (isLoggedIn()) {
			setLocalStorageApi(key, value);
		}
	},
	removeItem: (key): void => {
		removeLocalStorageApi(key);
	},
};

const refetch = (queryClient: QueryClient, query: Query): void => {
	if (isLoggedIn()) {
		void queryClient.refetchQueries({
			predicate: (candidate) => candidate === query,
			active: true,
		});
	}
};

/**
 * Refetches each restored entry the first time a component reads it. Staleness
 * is not enough: some boot calls opt out of refetching on mount.
 */
const refreshOnFirstUse = (queryClient: QueryClient): void => {
	const cache = queryClient.getQueryCache();
	const pending = new Set(
		cache
			.getAll()
			.filter((query) => isBootQuery(query) && query.state.data !== undefined),
	);

	pending.forEach((query) => {
		if (query.isActive()) {
			pending.delete(query);
			refetch(queryClient, query);
		}
	});

	if (pending.size === 0) {
		return;
	}

	const unsubscribe = cache.subscribe((event) => {
		if (
			event?.type !== 'observerAdded' ||
			!pending.has(event.query) ||
			!event.query.isActive()
		) {
			return;
		}
		pending.delete(event.query);
		refetch(queryClient, event.query);
		if (pending.size === 0) {
			unsubscribe();
		}
	});
};

/**
 * Restores the session calls (user, license, flags, role, preferences) from the
 * last visit so the shell renders without waiting on them, then refreshes them.
 * Call before the first render: the restore lands in a microtask.
 */
export const persistBootQueries = (queryClient: QueryClient): void => {
	if (!isLoggedIn()) {
		clearBootQueryCache();
	}

	void persistQueryClient({
		queryClient,
		persistor: createWebStoragePersistor({
			storage,
			key: LOCALSTORAGE.BOOT_QUERY_CACHE,
		}),
		maxAge: MAX_AGE_MS,
		buster: BUSTER,
		dehydrateOptions: {
			shouldDehydrateQuery: (query): boolean =>
				isLoggedIn() && query.state.status === 'success' && isBootQuery(query),
		},
	}).then(() => refreshOnFirstUse(queryClient));
};

export { clearBootQueryCache };
