import { act, renderHook, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { ReactNode } from 'react';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { GlobalTimeProvider } from '../GlobalTimeContext';
import { GlobalTimeProviderOptions } from '../types';
import { useIsGlobalTimeQueryRefreshing } from '../useIsGlobalTimeQueryRefreshing';

const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const createWrapper = (
	queryClient: QueryClient,
): (({ children }: { children: ReactNode }) => JSX.Element) => {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
};

const createProviderWrapper = (
	providerProps: GlobalTimeProviderOptions,
	queryClient: QueryClient,
): (({ children }: { children: ReactNode }) => JSX.Element) => {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<NuqsTestingAdapter>
					<GlobalTimeProvider {...providerProps}>{children}</GlobalTimeProvider>
				</NuqsTestingAdapter>
			</QueryClientProvider>
		);
	};
};

describe('useIsGlobalTimeQueryRefreshing', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
	});

	afterEach(() => {
		queryClient.clear();
	});

	it('should return false when no queries are fetching', () => {
		const wrapper = createWrapper(queryClient);
		const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
			wrapper,
		});

		expect(result.current).toBe(false);
	});

	it('should return true when AUTO_REFRESH_QUERY is fetching', async () => {
		let resolveQuery: (value: unknown) => void;
		const queryPromise = new Promise((resolve) => {
			resolveQuery = resolve;
		});

		const wrapper = createWrapper(queryClient);

		// Start the auto-refresh query
		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'test'],
					queryFn: () => queryPromise,
				}),
			{ wrapper },
		);

		// Check if refreshing hook detects it
		const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
			wrapper,
		});

		// Should be true while fetching
		expect(result.current).toBe(true);

		// Resolve the query
		act(() => {
			resolveQuery({ data: 'done' });
		});

		// Should be false after fetching completes
		await waitFor(() => {
			expect(result.current).toBe(false);
		});
	});

	it('should return false when non-AUTO_REFRESH_QUERY is fetching', async () => {
		let resolveQuery: (value: unknown) => void;
		const queryPromise = new Promise((resolve) => {
			resolveQuery = resolve;
		});

		const wrapper = createWrapper(queryClient);

		// Start a regular query (not auto-refresh)
		renderHook(
			() =>
				useQuery({
					queryKey: ['regular-query'],
					queryFn: () => queryPromise,
				}),
			{ wrapper },
		);

		// Check if refreshing hook detects it
		const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
			wrapper,
		});

		// Should be false - not an auto-refresh query
		expect(result.current).toBe(false);

		// Cleanup
		act(() => {
			resolveQuery({ data: 'done' });
		});
	});

	it('should return true when multiple AUTO_REFRESH_QUERY queries are fetching', async () => {
		let resolveQuery1: (value: unknown) => void;
		let resolveQuery2: (value: unknown) => void;
		const queryPromise1 = new Promise((resolve) => {
			resolveQuery1 = resolve;
		});
		const queryPromise2 = new Promise((resolve) => {
			resolveQuery2 = resolve;
		});

		const wrapper = createWrapper(queryClient);

		// Start multiple auto-refresh queries
		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query1'],
					queryFn: () => queryPromise1,
				}),
			{ wrapper },
		);

		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query2'],
					queryFn: () => queryPromise2,
				}),
			{ wrapper },
		);

		const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
			wrapper,
		});

		// Should be true while fetching
		expect(result.current).toBe(true);

		// Resolve first query
		act(() => {
			resolveQuery1({ data: 'done1' });
		});

		// Should still be true (second query still fetching)
		await waitFor(() => {
			expect(result.current).toBe(true);
		});

		// Resolve second query
		act(() => {
			resolveQuery2({ data: 'done2' });
		});

		// Should be false after all complete
		await waitFor(() => {
			expect(result.current).toBe(false);
		});
	});

	it('should only track AUTO_REFRESH_QUERY, not other queries', async () => {
		let resolveAutoRefresh: (value: unknown) => void;
		let resolveRegular: (value: unknown) => void;
		const autoRefreshPromise = new Promise((resolve) => {
			resolveAutoRefresh = resolve;
		});
		const regularPromise = new Promise((resolve) => {
			resolveRegular = resolve;
		});

		const wrapper = createWrapper(queryClient);

		// Start both types of queries
		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'auto'],
					queryFn: () => autoRefreshPromise,
				}),
			{ wrapper },
		);

		renderHook(
			() =>
				useQuery({
					queryKey: ['regular'],
					queryFn: () => regularPromise,
				}),
			{ wrapper },
		);

		const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
			wrapper,
		});

		// Should be true (auto-refresh is fetching)
		expect(result.current).toBe(true);

		// Resolve auto-refresh query
		act(() => {
			resolveAutoRefresh({ data: 'done' });
		});

		// Should be false even though regular query is still fetching
		await waitFor(() => {
			expect(result.current).toBe(false);
		});

		// Cleanup
		act(() => {
			resolveRegular({ data: 'done' });
		});
	});

	describe('scoped refreshing check with store name', () => {
		it('should return true only for queries matching store name', async () => {
			let resolveNamedQuery: (value: unknown) => void;
			const namedQueryPromise = new Promise((resolve) => {
				resolveNamedQuery = resolve;
			});

			const wrapper = createProviderWrapper(
				{ name: 'drawer', initialTime: '15m' },
				queryClient,
			);

			// Start query with matching name
			renderHook(
				() =>
					useQuery({
						queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'drawer', 'test'],
						queryFn: () => namedQueryPromise,
					}),
				{ wrapper },
			);

			// Check refreshing status
			const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
				wrapper,
			});

			// Should be true - named query is fetching
			expect(result.current).toBe(true);

			// Resolve the query
			act(() => {
				resolveNamedQuery({ data: 'done' });
			});

			await waitFor(() => {
				expect(result.current).toBe(false);
			});
		});

		it('should return false when only different store queries are fetching', async () => {
			let resolveOtherQuery: (value: unknown) => void;
			const otherQueryPromise = new Promise((resolve) => {
				resolveOtherQuery = resolve;
			});

			const wrapper = createProviderWrapper(
				{ name: 'drawer', initialTime: '15m' },
				queryClient,
			);

			// Start query with different name (belongs to different store)
			renderHook(
				() =>
					useQuery({
						queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'other-store', 'test'],
						queryFn: () => otherQueryPromise,
					}),
				{ wrapper },
			);

			// Check refreshing status for 'drawer' store
			const { result } = renderHook(() => useIsGlobalTimeQueryRefreshing(), {
				wrapper,
			});

			// Should be false - the fetching query belongs to 'other-store', not 'drawer'
			expect(result.current).toBe(false);

			// Cleanup
			act(() => {
				resolveOtherQuery({ data: 'done' });
			});
		});
	});
});
