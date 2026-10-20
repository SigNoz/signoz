import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getTraceThread } from 'api/generated/services/tracedetail';

import { useTraceThread } from '../useTraceThread';

jest.mock('api/generated/services/tracedetail', () => ({
	getGetTraceThreadQueryKey: (...args: unknown[]): unknown[] => [
		'thread',
		...args,
	],
	getTraceThread: jest.fn(),
}));

const SPANS_PER_PAGE = 3;
const LAST_PAGE = 2;

// Page n is reached with `before: c{n+1}` or `after: c{n-1}`; the first request returns the last page.
function page(n: number): unknown {
	return {
		data: {
			spans: Array.from({ length: SPANS_PER_PAGE }, (_, i) => ({
				span_id: `span-${n}-${i}`,
			})),
			prevCursor: n > 0 ? `c${n}` : undefined,
			nextCursor: n < LAST_PAGE ? `c${n}` : undefined,
		},
	};
}

function cursorPage(cursor: string, offset: number): number {
	return Number(cursor.slice(1)) + offset;
}

function renderThread(): {
	result: { current: ReturnType<typeof useTraceThread> };
	queryClient: QueryClient;
} {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(
		() => useTraceThread({ traceId: 'trace', interestedSpanId: 'span' }),
		{ wrapper },
	);
	return { result, queryClient };
}

describe('useTraceThread', () => {
	beforeEach(() => {
		(getTraceThread as jest.Mock).mockImplementation(
			(_path, { before, after }: { before?: string; after?: string }) => {
				if (before) {
					return Promise.resolve(page(cursorPage(before, -1)));
				}
				if (after) {
					return Promise.resolve(page(cursorPage(after, 1)));
				}
				return Promise.resolve(page(LAST_PAGE));
			},
		);
	});

	it('counts spans prepended above the first page', async () => {
		const { result } = renderThread();
		await waitFor(() => expect(result.current.spans).toHaveLength(3));
		expect(result.current.spansAboveFirstPage).toBe(0);

		await act(() => result.current.fetchPreviousPage());
		await act(() => result.current.fetchPreviousPage());

		expect(result.current.spans).toHaveLength(9);
		expect(result.current.spansAboveFirstPage).toBe(6);
	});

	it('keeps spansAboveFirstPage stable across a refetch', async () => {
		const { result, queryClient } = renderThread();
		await waitFor(() => expect(result.current.spans).toHaveLength(3));
		await act(() => result.current.fetchPreviousPage());
		await act(() => result.current.fetchPreviousPage());

		await act(() => queryClient.refetchQueries());

		expect(result.current.spans).toHaveLength(9);
		expect(result.current.spansAboveFirstPage).toBe(6);
	});
});
