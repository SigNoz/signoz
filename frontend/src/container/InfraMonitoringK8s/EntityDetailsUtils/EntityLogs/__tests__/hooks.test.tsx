import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
	mockQueryRangeV5WithError,
	mockQueryRangeV5WithLogsResponse,
} from '../../../../../__tests__/query_range_v5.util';
import { useInfiniteEntityLogs } from '../hooks';

const createWrapper = (): React.FC<{ children: React.ReactNode }> => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
};

describe('useInfiniteEntityLogs', () => {
	const defaultParams = {
		queryKey: 'entityLogsTest',
		timeRange: { startTime: 1708000000, endTime: 1708003600 },
		expression: 'k8s.pod.name = "test"',
	};

	describe('initial state', () => {
		it('should return initial loading state', () => {
			mockQueryRangeV5WithLogsResponse({
				delay: 100,
			});

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
			expect(result.current.logs).toStrictEqual([]);
		});
	});

	describe('successful data fetching', () => {
		it('should return logs after successful fetch', async () => {
			mockQueryRangeV5WithLogsResponse({
				pageSize: 5,
				hasMore: true,
			});

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.error).toBeFalsy();
			expect(result.current.logs).toHaveLength(5);
			expect(result.current.isError).toBe(false);
		});

		it('should set hasNextPage based on response size', async () => {
			mockQueryRangeV5WithLogsResponse({
				pageSize: 100,
				hasMore: true,
			});

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.hasNextPage).toBe(true);
		});

		it('should not have next page when response is smaller than page size', async () => {
			mockQueryRangeV5WithLogsResponse({
				pageSize: 100,
				hasMore: false,
			});

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.hasNextPage).toBe(false);
		});
	});

	describe('empty state', () => {
		it('should return empty logs array when no data', async () => {
			mockQueryRangeV5WithLogsResponse({
				pageSize: 0,
				hasMore: false,
			});

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.logs).toStrictEqual([]);
			expect(result.current.hasNextPage).toBe(false);
		});
	});

	describe('error handling', () => {
		it('should set isError on API failure', async () => {
			mockQueryRangeV5WithError('Internal Server Error');

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.logs).toStrictEqual([]);
		});
	});

	describe('load more functionality', () => {
		it('should fetch next page when loadMoreLogs is called', async () => {
			const requestCount = { count: 0 };

			mockQueryRangeV5WithLogsResponse({
				pageSize: 100,
				offset: 0,
				hasMore: true,
				onReceiveRequest: () => {
					requestCount.count += 1;

					if (requestCount.count > 1) {
						return { offset: 100, pageSize: 100, hasMore: false };
					}

					return undefined;
				},
			});

			const { result } = renderHook(() => useInfiniteEntityLogs(defaultParams), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.logs).toHaveLength(100);
			expect(result.current.hasNextPage).toBe(true);
			expect(requestCount.count).toBe(1);

			act(() => {
				result.current.loadMoreLogs();
			});

			await waitFor(() => {
				expect(result.current.logs).toHaveLength(150);
			});

			expect(result.current.hasNextPage).toBe(false);
			expect(requestCount.count).toBe(2);
		});
	});
});
