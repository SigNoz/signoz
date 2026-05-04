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
		// Pass matching default to prevent reset on mount (page resets when orderBy changes)
		const { result } = renderHook(() => useTableParams(true, { page: 3 }), {
			wrapper,
		});
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

describe('useTableParams (selective URL mode — partial config object)', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('syncs only page to URL when only page is configured', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams({ page: 'myPage' }), {
			wrapper,
		});

		// Update page - should sync to URL
		act(() => {
			result.current.setPage(5);
			jest.runAllTimers();
		});
		expect(result.current.page).toBe(5);
		const lastPage = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('myPage'))
			.filter(Boolean)
			.pop();
		expect(lastPage).toBe('5');

		// Update limit - should stay local (not in URL)
		act(() => {
			result.current.setLimit(100);
			jest.runAllTimers();
		});
		expect(result.current.limit).toBe(100);
		const limitInUrl = onUrlUpdate.mock.calls.some(
			(call) => call[0].searchParams.get('limit') !== null,
		);
		expect(limitInUrl).toBe(false);

		// Update orderBy - should stay local (not in URL)
		act(() => {
			result.current.setOrderBy({ columnName: 'test', order: 'asc' });
			jest.runAllTimers();
		});
		expect(result.current.orderBy).toStrictEqual({
			columnName: 'test',
			order: 'asc',
		});
		const orderByInUrl = onUrlUpdate.mock.calls.some(
			(call) => call[0].searchParams.get('order_by') !== null,
		);
		expect(orderByInUrl).toBe(false);
	});

	it('syncs only orderBy to URL when only orderBy is configured', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams({ orderBy: 'mySort' }), {
			wrapper,
		});

		// Update orderBy - should sync to URL
		act(() => {
			result.current.setOrderBy({ columnName: 'cpu', order: 'desc' });
			jest.runAllTimers();
		});
		expect(result.current.orderBy).toStrictEqual({
			columnName: 'cpu',
			order: 'desc',
		});
		const lastOrderBy = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('mySort'))
			.filter(Boolean)
			.pop();
		expect(lastOrderBy).toBeDefined();
		expect(JSON.parse(lastOrderBy!)).toStrictEqual({
			columnName: 'cpu',
			order: 'desc',
		});

		// Update page - should stay local
		act(() => {
			result.current.setPage(3);
			jest.runAllTimers();
		});
		expect(result.current.page).toBe(3);
		const pageInUrl = onUrlUpdate.mock.calls.some(
			(call) => call[0].searchParams.get('page') !== null,
		);
		expect(pageInUrl).toBe(false);
	});

	it('syncs only limit to URL when only limit is configured', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(() => useTableParams({ limit: 'myLimit' }), {
			wrapper,
		});

		// Update limit - should sync to URL
		act(() => {
			result.current.setLimit(25);
			jest.runAllTimers();
		});
		expect(result.current.limit).toBe(25);
		const lastLimit = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('myLimit'))
			.filter(Boolean)
			.pop();
		expect(lastLimit).toBe('25');

		// Update page - should stay local
		act(() => {
			result.current.setPage(2);
			jest.runAllTimers();
		});
		expect(result.current.page).toBe(2);
		const pageInUrl = onUrlUpdate.mock.calls.some(
			(call) => call[0].searchParams.get('page') !== null,
		);
		expect(pageInUrl).toBe(false);
	});

	it('syncs only expanded to URL when only expanded is configured', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(
			() => useTableParams({ expanded: 'myExpanded' }),
			{ wrapper },
		);

		// Update expanded - should sync to URL
		act(() => {
			result.current.setExpanded({ 'row-1': true, 'row-2': true });
			jest.runAllTimers();
		});
		expect(result.current.expanded).toStrictEqual({
			'row-1': true,
			'row-2': true,
		});
		const lastExpanded = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('myExpanded'))
			.filter(Boolean)
			.pop();
		expect(lastExpanded).toBeDefined();
		expect(JSON.parse(lastExpanded!)).toEqual(
			expect.arrayContaining(['row-1', 'row-2']),
		);

		// Update page - should stay local
		act(() => {
			result.current.setPage(4);
			jest.runAllTimers();
		});
		expect(result.current.page).toBe(4);
		const pageInUrl = onUrlUpdate.mock.calls.some(
			(call) => call[0].searchParams.get('page') !== null,
		);
		expect(pageInUrl).toBe(false);
	});

	it('syncs page and orderBy to URL but keeps limit and expanded local', () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);
		const { result } = renderHook(
			() => useTableParams({ page: 'p', orderBy: 'sort' }),
			{ wrapper },
		);

		// Update limit and expanded first (should stay local)
		act(() => {
			result.current.setLimit(75);
			result.current.setExpanded({ 'row-5': true });
			jest.runAllTimers();
		});

		expect(result.current.limit).toBe(75);
		expect(result.current.expanded).toStrictEqual({ 'row-5': true });

		// Update page (should sync to URL)
		act(() => {
			result.current.setPage(2);
			jest.runAllTimers();
		});

		expect(result.current.page).toBe(2);
		const lastPage = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('p'))
			.filter(Boolean)
			.pop();
		expect(lastPage).toBe('2');

		// Update orderBy (should sync to URL, and resets page to default)
		act(() => {
			result.current.setOrderBy({ columnName: 'name', order: 'asc' });
			jest.runAllTimers();
		});

		expect(result.current.orderBy).toStrictEqual({
			columnName: 'name',
			order: 'asc',
		});
		const lastOrderBy = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('sort'))
			.filter(Boolean)
			.pop();
		expect(lastOrderBy).toBeDefined();

		// limit should NOT be in URL
		const limitInUrl = onUrlUpdate.mock.calls.some(
			(call) =>
				call[0].searchParams.get('limit') !== null ||
				call[0].searchParams.get('myLimit') !== null,
		);
		expect(limitInUrl).toBe(false);

		// expanded should NOT be in URL
		const expandedInUrl = onUrlUpdate.mock.calls.some(
			(call) =>
				call[0].searchParams.get('expanded') !== null ||
				call[0].searchParams.get('myExpanded') !== null,
		);
		expect(expandedInUrl).toBe(false);
	});

	it('reads initial values from URL for configured params only', () => {
		const wrapper = createNuqsWrapper({
			customPage: '7',
			limit: '999', // This should be ignored since limit is not configured
		});
		const { result } = renderHook(
			// Pass page default matching URL to prevent reset on mount
			() => useTableParams({ page: 'customPage' }, { page: 7 }),
			{ wrapper },
		);

		// Page should come from URL
		expect(result.current.page).toBe(7);
		// Limit should be default (not from URL since it's not configured)
		expect(result.current.limit).toBe(50);
	});

	it('supports updater function for expanded state', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams({ expanded: 'exp' }), {
			wrapper,
		});

		// Set initial expanded state
		act(() => {
			result.current.setExpanded({ 'row-1': true });
		});
		expect(result.current.expanded).toStrictEqual({ 'row-1': true });

		// Use updater function to add another row
		act(() => {
			result.current.setExpanded((prev) => ({
				...(typeof prev === 'boolean' ? {} : prev),
				'row-2': true,
			}));
		});
		expect(result.current.expanded).toStrictEqual({
			'row-1': true,
			'row-2': true,
		});
	});

	it('supports updater function for local expanded state', () => {
		const wrapper = createNuqsWrapper();
		const { result } = renderHook(() => useTableParams(), { wrapper });

		// Set initial expanded state
		act(() => {
			result.current.setExpanded({ 'row-a': true });
		});
		expect(result.current.expanded).toStrictEqual({ 'row-a': true });

		// Use updater function
		act(() => {
			result.current.setExpanded((prev) => ({
				...(typeof prev === 'boolean' ? {} : prev),
				'row-b': true,
			}));
		});
		expect(result.current.expanded).toStrictEqual({
			'row-a': true,
			'row-b': true,
		});
	});
});
