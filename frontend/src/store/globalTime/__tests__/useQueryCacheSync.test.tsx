import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactNode } from 'react';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { createGlobalTimeStore, GlobalTimeStoreApi } from '../globalTimeStore';
import { useQueryCacheSync } from '../useQueryCacheSync';

function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
}

function createWrapper(
	queryClient: QueryClient,
): ({ children }: { children: ReactNode }) => JSX.Element {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

describe('useQueryCacheSync', () => {
	let store: GlobalTimeStoreApi;
	let queryClient: QueryClient;

	beforeEach(() => {
		store = createGlobalTimeStore();
		queryClient = createTestQueryClient();
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
		queryClient.clear();
	});

	it('should update lastRefreshTimestamp when auto-refresh query succeeds', async () => {
		// Initialize store
		act(() => {
			store.getState().computeAndStoreMinMax();
		});

		const initialTimestamp = store.getState().lastRefreshTimestamp;

		// Advance time
		act(() => {
			jest.advanceTimersByTime(5000);
		});

		// Render the hook
		renderHook(() => useQueryCacheSync(store), {
			wrapper: createWrapper(queryClient),
		});

		// Simulate a successful auto-refresh query
		await act(async () => {
			await queryClient.fetchQuery({
				queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'test'],
				queryFn: () => Promise.resolve({ data: 'test' }),
			});
		});

		await waitFor(() => {
			expect(store.getState().lastRefreshTimestamp).toBeGreaterThan(
				initialTimestamp,
			);
		});
	});

	it('should not update timestamp for non-auto-refresh queries', async () => {
		act(() => {
			store.getState().computeAndStoreMinMax();
		});

		const initialTimestamp = store.getState().lastRefreshTimestamp;

		renderHook(() => useQueryCacheSync(store), {
			wrapper: createWrapper(queryClient),
		});

		// Simulate a regular query (not auto-refresh)
		await act(async () => {
			await queryClient.fetchQuery({
				queryKey: ['some-other-query'],
				queryFn: () => Promise.resolve({ data: 'test' }),
			});
		});

		expect(store.getState().lastRefreshTimestamp).toBe(initialTimestamp);
	});
});
