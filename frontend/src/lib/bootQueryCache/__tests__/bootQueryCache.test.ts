import { QueryClient, QueryObserver } from 'react-query';
import { LOCALSTORAGE } from 'constants/localStorage';
import { IsAdminPermission } from 'lib/authz/hooks/useAuthZ/legacy';

import { clearBootQueryCache, persistBootQueries } from '..';

const FLAGS_KEY = ['GET_FEATURES_FLAGS'];
const ROLE_KEY = ['authz', IsAdminPermission];

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const stored = (): string | null =>
	localStorage.getItem(LOCALSTORAGE.BOOT_QUERY_CACHE);

// The persistor throttles saves to one per second.
const waitForSave = (): Promise<void> =>
	new Promise((r) => setTimeout(r, 1100));

describe('persistBootQueries', () => {
	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem(LOCALSTORAGE.IS_LOGGED_IN, 'true');
	});

	const saveFlags = async (): Promise<void> => {
		const client = new QueryClient();
		persistBootQueries(client);
		await flush();
		client.setQueryData(FLAGS_KEY, { data: [{ name: 'flag', active: true }] });
		client.setQueryData(ROLE_KEY, { [IsAdminPermission]: { isGranted: true } });
		client.setQueryData(['query_range'], { rows: [1, 2, 3] });
		await waitForSave();
	};

	it('saves only the boot queries', async () => {
		await saveFlags();

		const saved = stored() ?? '';
		expect(saved).toContain('GET_FEATURES_FLAGS');
		expect(saved).toContain('role:signoz-admin');
		expect(saved).not.toContain('query_range');
	});

	it('restores the boot queries and refetches each on first use, even with refetchOnMount off', async () => {
		await saveFlags();

		const client = new QueryClient();
		persistBootQueries(client);
		await flush();
		await flush();

		expect(client.getQueryData(FLAGS_KEY)).toEqual({
			data: [{ name: 'flag', active: true }],
		});

		const queryFn = jest.fn(async () => ({
			[IsAdminPermission]: { isGranted: false },
		}));
		const observer = new QueryObserver(client, {
			queryKey: ROLE_KEY,
			queryFn,
			refetchOnMount: false,
			staleTime: Infinity,
		});
		const unsubscribe = observer.subscribe(() => undefined);

		expect(observer.getCurrentResult().data).toEqual({
			[IsAdminPermission]: { isGranted: true },
		});
		await flush();
		await flush();
		expect(queryFn).toHaveBeenCalledTimes(1);

		unsubscribe();
	});

	it('does not refetch a restored query that is disabled', async () => {
		await saveFlags();

		const client = new QueryClient();
		persistBootQueries(client);
		await flush();
		await flush();

		const queryFn = jest.fn(async () => ({ data: [] }));
		const observer = new QueryObserver(client, {
			queryKey: FLAGS_KEY,
			queryFn,
			enabled: false,
		});
		const unsubscribe = observer.subscribe(() => undefined);
		await flush();

		expect(queryFn).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('drops the cache when the app starts logged out', async () => {
		await saveFlags();
		localStorage.removeItem(LOCALSTORAGE.IS_LOGGED_IN);

		const client = new QueryClient();
		persistBootQueries(client);
		await flush();

		expect(stored()).toBeNull();
		expect(client.getQueryData(FLAGS_KEY)).toBeUndefined();
	});

	it('does not write the session back after logout', async () => {
		const client = new QueryClient();
		persistBootQueries(client);
		await flush();
		client.setQueryData(FLAGS_KEY, { data: [] });

		localStorage.removeItem(LOCALSTORAGE.IS_LOGGED_IN);
		clearBootQueryCache();
		await waitForSave();

		expect(stored()).toBeNull();
	});
});
