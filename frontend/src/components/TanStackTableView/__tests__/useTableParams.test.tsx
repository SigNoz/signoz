import { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import {
	NuqsTestingAdapter,
	OnUrlUpdateFunction,
	UrlUpdateEvent,
} from 'nuqs/adapters/testing';

import { useTableParams } from '../useTableParams';

function createNuqsWrapper(
	queryParams?: Record<string, string>,
	onUrlUpdate?: OnUrlUpdateFunction,
): ({ children }: { children: ReactNode }) => JSX.Element {
	return function NuqsWrapper({
		children,
	}: {
		children: ReactNode;
	}): JSX.Element {
		return (
			<NuqsTestingAdapter
				searchParams={queryParams}
				onUrlUpdate={onUrlUpdate}
				hasMemory
			>
				{children}
			</NuqsTestingAdapter>
		);
	};
}

describe('useTableParams (local mode — enableQueryParams not set)', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns default page=1 and limit=50', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams(), { wrapper });
		expect(result.current.page).toBe(1);
		expect(result.current.limit).toBe(50);
		expect(result.current.orderBy).toBeNull();
	});

	it('respects custom defaults', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(
			() => useTableParams(undefined, { page: 2, limit: 25 }),
			{ wrapper },
		);
		expect(result.current.page).toBe(2);
		expect(result.current.limit).toBe(25);
	});

	it('setPage updates page', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams(), { wrapper });
		act(() => {
			result.current.setPage(3);
		});
		expect(result.current.page).toBe(3);
	});

	it('setLimit updates limit', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams(), { wrapper });
		act(() => {
			result.current.setLimit(100);
		});
		expect(result.current.limit).toBe(100);
	});

	it('setOrderBy updates orderBy', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams(), { wrapper });
		act(() => {
			result.current.setOrderBy({ columnName: 'cpu', order: 'desc' });
		});
		expect(result.current.orderBy).toStrictEqual({
			columnName: 'cpu',
			order: 'desc',
		});
	});
});

describe('useTableParams (URL mode — enableQueryParams set)', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('uses nuqs state when enableQueryParams=true', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams(true), { wrapper });
		expect(result.current.page).toBe(1);
		act(() => {
			result.current.setPage(5);
			jest.runAllTimers();
		});
		expect(result.current.page).toBe(5);
	});

	it('uses prefixed keys when enableQueryParams is a string', () => {
		const wrapper = createNuqsWrapper({ pods_page: '2' });
		const { result } = renderHook(() => useTableParams('pods', { page: 2 }), {
			wrapper,
		});
		expect(result.current.page).toBe(2);
		act(() => {
			result.current.setPage(4);
			jest.runAllTimers();
		});
		expect(result.current.page).toBe(4);
	});

	it('local state is ignored when enableQueryParams is set', () => {
		const localWrapper = createNuqsWrapper();
		const urlWrapper = createNuqsWrapper();
		const { result: local } = renderHook(() => useTableParams(), {
			wrapper: localWrapper,
		});
		const { result: url } = renderHook(() => useTableParams(true), {
			wrapper: urlWrapper,
		});
		act(() => {
			local.current.setPage(99);
		});
		// URL mode hook in a separate wrapper should still have its own state
		expect(url.current.page).toBe(1);
	});

	it('reads initial page from URL params', () => {
		const wrapper = createNuqsWrapper({ page: '3' });
		const { result } = renderHook(() => useTableParams(true), { wrapper });
		expect(result.current.page).toBe(3);
	});

	it('reads initial orderBy from URL params', () => {
		const orderBy = JSON.stringify({ columnName: 'name', order: 'desc' });
		const wrapper = createNuqsWrapper({ order_by: orderBy });
		const { result } = renderHook(() => useTableParams(true), { wrapper });
		expect(result.current.orderBy).toStrictEqual({
			columnName: 'name',
			order: 'desc',
		});
	});

	it('updates URL when setPage is called', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams(true), { wrapper });

		act(() => {
			result.current.setPage(5);
			jest.runAllTimers();
		});

		const lastPage = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('page'))
			.filter(Boolean)
			.pop();
		expect(lastPage).toBe('5');
	});

	it('updates URL when setOrderBy is called', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams(true), { wrapper });

		act(() => {
			result.current.setOrderBy({ columnName: 'value', order: 'asc' });
			jest.runAllTimers();
		});

		const lastOrderBy = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('order_by'))
			.filter(Boolean)
			.pop();
		expect(lastOrderBy).toBeDefined();
		expect(JSON.parse(lastOrderBy!)).toStrictEqual({
			columnName: 'value',
			order: 'asc',
		});
	});

	it('uses custom param names from config object', () => {
		const config = {
			page: 'listPage',
			limit: 'listLimit',
			orderBy: 'listOrderBy',
			expanded: 'listExpanded',
		};
		const wrapper = createNuqsWrapper({ listPage: '3' });
		const { result } = renderHook(() => useTableParams(config, { page: 3 }), {
			wrapper,
		});
		expect(result.current.page).toBe(3);
	});

	it('manages expanded state for row expansion', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams(true), { wrapper });

		act(() => {
			result.current.setExpanded({ 'row-1': true });
		});

		expect(result.current.expanded).toStrictEqual({ 'row-1': true });
	});

	it('toggles sort order correctly: null → asc → desc → null', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams(true), { wrapper });

		// Initial state
		expect(result.current.orderBy).toBeNull();

		// First click: null → asc
		act(() => {
			result.current.setOrderBy({ columnName: 'id', order: 'asc' });
		});
		expect(result.current.orderBy).toStrictEqual({
			columnName: 'id',
			order: 'asc',
		});

		// Second click: asc → desc
		act(() => {
			result.current.setOrderBy({ columnName: 'id', order: 'desc' });
		});
		expect(result.current.orderBy).toStrictEqual({
			columnName: 'id',
			order: 'desc',
		});

		// Third click: desc → null
		act(() => {
			result.current.setOrderBy(null);
		});
		expect(result.current.orderBy).toBeNull();
	});
});
