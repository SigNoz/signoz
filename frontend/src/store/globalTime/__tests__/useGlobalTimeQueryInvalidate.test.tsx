import { act, renderHook, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { ReactNode } from 'react';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { GlobalTimeProvider } from '../GlobalTimeContext';
import { useGlobalTime } from '../hooks';
import { GlobalTimeProviderOptions } from '../types';
import { useGlobalTimeQueryInvalidate } from '../useGlobalTimeQueryInvalidate';
import { createCustomTimeRange, NANO_SECOND_MULTIPLIER } from '../utils';

const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				cacheTime: Infinity,
			},
		},
	});

const createWrapper = (
	providerProps: GlobalTimeProviderOptions,
	queryClient: QueryClient,
) => {
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

describe('useGlobalTimeQueryInvalidate', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
		queryClient.clear();
	});

	it('should return a function', () => {
		const wrapper = createWrapper({ initialTime: '15m' }, queryClient);
		const { result } = renderHook(() => useGlobalTimeQueryInvalidate(), {
			wrapper,
		});

		expect(typeof result.current).toBe('function');
	});

	it('should call computeAndStoreMinMax before invalidating queries (refresh disabled)', async () => {
		const wrapper = createWrapper(
			{ initialTime: '15m', refreshInterval: 0 }, // refresh disabled so computeAndStoreMinMax computes fresh values
			queryClient,
		);
		const { result } = renderHook(
			() => ({
				invalidate: useGlobalTimeQueryInvalidate(),
				globalTime: useGlobalTime(),
			}),
			{ wrapper },
		);

		// Initial computation - need to call computeAndStoreMinMax first
		act(() => {
			result.current.globalTime.computeAndStoreMinMax();
		});
		const initialMinMax = { ...result.current.globalTime.lastComputedMinMax };

		// Advance time past minute boundary
		act(() => {
			jest.advanceTimersByTime(60000);
		});

		// Call invalidate - should compute fresh values when refresh is disabled
		await act(async () => {
			await result.current.invalidate();
		});

		// lastComputedMinMax should have been updated
		expect(result.current.globalTime.lastComputedMinMax.maxTime).toBe(
			initialMinMax.maxTime + 60000 * NANO_SECOND_MULTIPLIER,
		);
	});

	it('should invalidate queries with AUTO_REFRESH_QUERY key', async () => {
		const mockQueryFn = jest.fn().mockResolvedValue({ data: 'test' });

		const wrapper = createWrapper({ initialTime: '15m' }, queryClient);

		// Set up a query with AUTO_REFRESH_QUERY key
		const { result: queryResult } = renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'test-query'],
					queryFn: mockQueryFn,
				}),
			{ wrapper },
		);

		// Wait for initial query to complete
		await waitFor(() => {
			expect(queryResult.current.isSuccess).toBe(true);
		});

		expect(mockQueryFn).toHaveBeenCalledTimes(1);

		// Now render the invalidate hook and call it
		const { result: invalidateResult } = renderHook(
			() => useGlobalTimeQueryInvalidate(),
			{ wrapper },
		);

		await act(async () => {
			await invalidateResult.current();
		});

		// Query should have been refetched
		await waitFor(() => {
			expect(mockQueryFn).toHaveBeenCalledTimes(2);
		});
	});

	it('should NOT invalidate queries without AUTO_REFRESH_QUERY key', async () => {
		const autoRefreshQueryFn = jest.fn().mockResolvedValue({ data: 'auto' });
		const regularQueryFn = jest.fn().mockResolvedValue({ data: 'regular' });

		const wrapper = createWrapper({ initialTime: '15m' }, queryClient);

		// Set up both types of queries
		const { result: autoRefreshQuery } = renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'auto-query'],
					queryFn: autoRefreshQueryFn,
				}),
			{ wrapper },
		);

		const { result: regularQuery } = renderHook(
			() =>
				useQuery({
					queryKey: ['regular-query'],
					queryFn: regularQueryFn,
				}),
			{ wrapper },
		);

		// Wait for initial queries to complete
		await waitFor(() => {
			expect(autoRefreshQuery.current.isSuccess).toBe(true);
			expect(regularQuery.current.isSuccess).toBe(true);
		});

		expect(autoRefreshQueryFn).toHaveBeenCalledTimes(1);
		expect(regularQueryFn).toHaveBeenCalledTimes(1);

		// Call invalidate
		const { result: invalidateResult } = renderHook(
			() => useGlobalTimeQueryInvalidate(),
			{ wrapper },
		);

		await act(async () => {
			await invalidateResult.current();
		});

		// Only auto-refresh query should be refetched
		await waitFor(() => {
			expect(autoRefreshQueryFn).toHaveBeenCalledTimes(2);
		});

		// Regular query should NOT be refetched
		expect(regularQueryFn).toHaveBeenCalledTimes(1);
	});

	it('should use exact custom time values (not rounded) when invalidating', async () => {
		// Use timestamps that are NOT on minute boundaries
		const minTimeWithSeconds =
			new Date('2024-01-15T12:15:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;
		const maxTimeWithSeconds =
			new Date('2024-01-15T12:30:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;

		const customTime = createCustomTimeRange(
			minTimeWithSeconds,
			maxTimeWithSeconds,
		);

		const wrapper = createWrapper({ initialTime: customTime }, queryClient);

		const { result } = renderHook(
			() => ({
				invalidate: useGlobalTimeQueryInvalidate(),
				globalTime: useGlobalTime(),
			}),
			{ wrapper },
		);

		// Call invalidate
		await act(async () => {
			await result.current.invalidate();
		});

		// Verify custom time values are NOT rounded
		expect(result.current.globalTime.lastComputedMinMax.minTime).toBe(
			minTimeWithSeconds,
		);
		expect(result.current.globalTime.lastComputedMinMax.maxTime).toBe(
			maxTimeWithSeconds,
		);
	});

	it('should invalidate multiple AUTO_REFRESH_QUERY queries at once', async () => {
		const queryFn1 = jest.fn().mockResolvedValue({ data: 'query1' });
		const queryFn2 = jest.fn().mockResolvedValue({ data: 'query2' });
		const queryFn3 = jest.fn().mockResolvedValue({ data: 'query3' });

		const wrapper = createWrapper({ initialTime: '15m' }, queryClient);

		// Set up multiple auto-refresh queries
		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query1'],
					queryFn: queryFn1,
				}),
			{ wrapper },
		);

		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query2'],
					queryFn: queryFn2,
				}),
			{ wrapper },
		);

		renderHook(
			() =>
				useQuery({
					queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query3'],
					queryFn: queryFn3,
				}),
			{ wrapper },
		);

		// Wait for initial queries
		await waitFor(() => {
			expect(queryFn1).toHaveBeenCalledTimes(1);
			expect(queryFn2).toHaveBeenCalledTimes(1);
			expect(queryFn3).toHaveBeenCalledTimes(1);
		});

		// Call invalidate
		const { result } = renderHook(() => useGlobalTimeQueryInvalidate(), {
			wrapper,
		});

		await act(async () => {
			await result.current();
		});

		// All queries should be refetched
		await waitFor(() => {
			expect(queryFn1).toHaveBeenCalledTimes(2);
			expect(queryFn2).toHaveBeenCalledTimes(2);
			expect(queryFn3).toHaveBeenCalledTimes(2);
		});
	});

	describe('scoped invalidation with store name', () => {
		it('should only invalidate queries matching store name', async () => {
			const namedQueryFn = jest.fn().mockResolvedValue({ data: 'named' });
			const unnamedQueryFn = jest.fn().mockResolvedValue({ data: 'unnamed' });

			const wrapper = createWrapper(
				{ name: 'drawer', initialTime: '15m' },
				queryClient,
			);

			// Query with matching name
			renderHook(
				() =>
					useQuery({
						queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'drawer', 'named-query'],
						queryFn: namedQueryFn,
					}),
				{ wrapper },
			);

			// Query without name (different store)
			renderHook(
				() =>
					useQuery({
						queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'unnamed-query'],
						queryFn: unnamedQueryFn,
					}),
				{ wrapper },
			);

			await waitFor(() => {
				expect(namedQueryFn).toHaveBeenCalledTimes(1);
				expect(unnamedQueryFn).toHaveBeenCalledTimes(1);
			});

			// Call invalidate
			const { result } = renderHook(() => useGlobalTimeQueryInvalidate(), {
				wrapper,
			});

			await act(async () => {
				await result.current();
			});

			// Only named query should be refetched
			await waitFor(() => {
				expect(namedQueryFn).toHaveBeenCalledTimes(2);
			});

			// Unnamed query should NOT be refetched
			expect(unnamedQueryFn).toHaveBeenCalledTimes(1);
		});

		it('should invalidate all queries for unnamed store (backward compatible)', async () => {
			const queryFn1 = jest.fn().mockResolvedValue({ data: 'query1' });
			const queryFn2 = jest.fn().mockResolvedValue({ data: 'query2' });

			// Unnamed store (no name prop)
			const wrapper = createWrapper({ initialTime: '15m' }, queryClient);

			renderHook(
				() =>
					useQuery({
						queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query1'],
						queryFn: queryFn1,
					}),
				{ wrapper },
			);

			renderHook(
				() =>
					useQuery({
						queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, 'query2'],
						queryFn: queryFn2,
					}),
				{ wrapper },
			);

			await waitFor(() => {
				expect(queryFn1).toHaveBeenCalledTimes(1);
				expect(queryFn2).toHaveBeenCalledTimes(1);
			});

			const { result } = renderHook(() => useGlobalTimeQueryInvalidate(), {
				wrapper,
			});

			await act(async () => {
				await result.current();
			});

			// Both should be refetched
			await waitFor(() => {
				expect(queryFn1).toHaveBeenCalledTimes(2);
				expect(queryFn2).toHaveBeenCalledTimes(2);
			});
		});
	});
});
