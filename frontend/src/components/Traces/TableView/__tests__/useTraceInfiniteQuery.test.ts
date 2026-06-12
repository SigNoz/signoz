/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, renderHook } from '@testing-library/react';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import type { Pagination } from 'hooks/queryPagination';

import { useTraceInfiniteQuery } from '../useTraceInfiniteQuery';

jest.mock('hooks/queryBuilder/useGetQueryRange', () => ({
	useGetQueryRange: jest.fn(),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockedUseGetQueryRange = useGetQueryRange as jest.MockedFunction<
	typeof useGetQueryRange
>;

type Row = { id: string; name: string };

const PAGE_SIZE = 50;

/**
 * Builds a fake `useGetQueryRange` return shape with a payload that
 * transforms into N rows.
 */
const makeQueryResult = (
	rowsForPage: Row[],
	overrides: Partial<{
		isLoading: boolean;
		isFetching: boolean;
		isError: boolean;
		error: Error | null;
	}> = {},
): any => ({
	data: {
		payload: { rows: rowsForPage },
		warning: undefined,
		statusCode: 200,
		error: null,
		message: '',
		params: {} as any,
		warnings: [],
	},
	isLoading: false,
	isFetching: false,
	isError: false,
	error: null,
	...overrides,
});

const emptyQueryResult = (
	overrides: Partial<{
		isLoading: boolean;
		isFetching: boolean;
		isError: boolean;
		error: Error | null;
	}> = {},
): any => ({
	data: undefined,
	isLoading: true,
	isFetching: false,
	isError: false,
	error: null,
	...overrides,
});

/** Generates N rows for a given page. */
const makePage = (offset: number, count: number): Row[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `row-${offset + i}`,
		name: `name-${offset + i}`,
	}));

const baseProps = (queryDeps: unknown[] = ['Q1']): any => ({
	queryDeps,
	buildRequest: jest.fn((pagination: Pagination) => ({
		query: {} as any,
		graphType: 'LIST' as any,
		selectedTime: 'GLOBAL_TIME' as any,
		globalSelectedInterval: '5m' as any,
		params: { dataSource: 'traces' },
		tableParams: { pagination },
	})),
	transformResponse: jest.fn(
		(payload: any): Row[] => (payload?.rows as Row[]) ?? [],
	),
	enabled: true,
	entityVersion: 'v5',
	panelType: 'LIST',
});

describe('useTraceInfiniteQuery', () => {
	beforeEach(() => {
		mockedUseGetQueryRange.mockReset();
	});

	it('starts with empty rows and hasMore=true; appends first page when data arrives', () => {
		mockedUseGetQueryRange.mockReturnValue(emptyQueryResult());

		const props = baseProps();
		const { result, rerender } = renderHook(() => useTraceInfiniteQuery(props));

		expect(result.current.rows).toStrictEqual([]);
		expect(result.current.isLoading).toBe(true);

		// First page returns 50 rows (full page → hasMore stays true).
		const page1 = makePage(0, PAGE_SIZE);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(page1));

		rerender();
		expect(result.current.rows).toStrictEqual(page1);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('appends the next page when handleEndReached is called (no replace)', () => {
		const page1 = makePage(0, PAGE_SIZE);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(page1));

		const props = baseProps();
		const { result, rerender } = renderHook(() => useTraceInfiniteQuery(props));

		expect(result.current.rows).toHaveLength(PAGE_SIZE);

		// Trigger next page — pagination state bumps offset.
		act(() => {
			result.current.handleEndReached();
		});

		// buildRequest is called again with the new offset; the hook would now ask
		// the mocked useGetQueryRange for the next slice. Simulate that by swapping
		// the returned payload to page 2 and rerendering.
		const page2 = makePage(PAGE_SIZE, PAGE_SIZE);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(page2));
		rerender();

		// Accumulator keeps page 1 + page 2.
		expect(result.current.rows).toHaveLength(PAGE_SIZE * 2);
		expect(result.current.rows[0]).toStrictEqual(page1[0]);
		expect(result.current.rows[PAGE_SIZE]).toStrictEqual(page2[0]);

		// buildRequest was called with offset 0 on first render and offset PAGE_SIZE
		// after handleEndReached.
		const offsets = props.buildRequest.mock.calls.map(
			(call: any) => call[0].offset,
		);
		expect(offsets).toContain(0);
		expect(offsets).toContain(PAGE_SIZE);
	});

	it('sets hasMore=false when fewer than PAGE_SIZE rows are returned; handleEndReached is a no-op afterwards', () => {
		const partialPage = makePage(0, 12);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(partialPage));

		const props = baseProps();
		const { result } = renderHook(() => useTraceInfiniteQuery(props));

		expect(result.current.rows).toStrictEqual(partialPage);

		// Capture buildRequest calls before EOF trigger.
		const callsBefore = props.buildRequest.mock.calls.length;

		act(() => {
			result.current.handleEndReached();
		});

		// hasMore should be false → handleEndReached short-circuits, no extra
		// buildRequest call (pagination state unchanged → no fetch trigger).
		expect(props.buildRequest.mock.calls).toHaveLength(callsBefore);
	});

	it('resets accumulator + pagination when queryDeps change', () => {
		const page1 = makePage(0, PAGE_SIZE);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(page1));

		const props = baseProps(['Q1']);
		const { result, rerender } = renderHook(
			(p: any) => useTraceInfiniteQuery(p),
			{ initialProps: props },
		);

		expect(result.current.rows).toHaveLength(PAGE_SIZE);

		// Scroll past page 1.
		act(() => {
			result.current.handleEndReached();
		});
		const page2 = makePage(PAGE_SIZE, PAGE_SIZE);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(page2));
		rerender(props);
		expect(result.current.rows).toHaveLength(PAGE_SIZE * 2);

		// queryDeps change → reset should clear the accumulator.
		const newPage = makePage(0, 5);
		mockedUseGetQueryRange.mockReturnValue(makeQueryResult(newPage));
		const nextProps = { ...props, queryDeps: ['Q2'] };
		rerender(nextProps);

		expect(result.current.rows).toStrictEqual(newPage);
	});

	it('propagates isError and error from useGetQueryRange', () => {
		const err = new Error('boom');
		mockedUseGetQueryRange.mockReturnValue(
			emptyQueryResult({ isLoading: false, isError: true, error: err }),
		);

		const props = baseProps();
		const { result } = renderHook(() => useTraceInfiniteQuery(props));

		expect(result.current.isError).toBe(true);
		expect(result.current.error).toBe(err);
		expect(result.current.rows).toStrictEqual([]);
	});

	it('calls setIsLoadingQueries when isLoading/isFetching changes', () => {
		const setIsLoadingQueries = jest.fn();
		mockedUseGetQueryRange.mockReturnValue(
			emptyQueryResult({ isLoading: true, isFetching: false }),
		);

		const props = { ...baseProps(), setIsLoadingQueries };
		const { rerender } = renderHook(() => useTraceInfiniteQuery(props));

		expect(setIsLoadingQueries).toHaveBeenCalledWith(true);

		mockedUseGetQueryRange.mockReturnValue(
			makeQueryResult([], { isLoading: false, isFetching: false }),
		);
		rerender();

		expect(setIsLoadingQueries).toHaveBeenLastCalledWith(false);
	});

	it('publishes the constructed queryKey via queryKeyRef', () => {
		mockedUseGetQueryRange.mockReturnValue(emptyQueryResult());

		const queryKeyRef = { current: null as unknown };
		const props = { ...baseProps(['orderBy-asc', 'time-1h']), queryKeyRef };

		renderHook(() => useTraceInfiniteQuery(props));

		expect(Array.isArray(queryKeyRef.current)).toBe(true);
		// First element is the GET_QUERY_RANGE tag, then pagination, then the
		// caller's queryDeps spread.
		expect(queryKeyRef.current as unknown[]).toStrictEqual(
			expect.arrayContaining(['orderBy-asc', 'time-1h']),
		);
	});

	it('forwards data.warning to setWarning when payload is present', () => {
		const setWarning = jest.fn();
		mockedUseGetQueryRange.mockReturnValue({
			data: {
				payload: { rows: makePage(0, 3) },
				warning: { message: 'partial' } as any,
				statusCode: 200,
				error: null,
				message: '',
				params: {} as any,
				warnings: [],
			} as any,
			isLoading: false,
			isFetching: false,
			isError: false,
			error: null,
		} as any);

		const props = { ...baseProps(), setWarning };
		renderHook(() => useTraceInfiniteQuery(props));

		expect(setWarning).toHaveBeenCalledWith({ message: 'partial' });
	});
});
