import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';

import useDashboardsListQueryParams, {
	DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
	IDashboardsListQueryParams,
} from '../useDashboardsListQueryParams';

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

function createTestWrapper(
	initialUrl: string,
): ({ children }: { children: React.ReactNode }) => JSX.Element {
	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return React.createElement(
			MemoryRouter,
			{ initialEntries: [initialUrl] },
			children,
		) as JSX.Element;
	};
}

describe('useDashboardsListQueryParams', () => {
	beforeEach(() => {
		mockSafeNavigate.mockClear();
		sessionStorage.clear();
	});

	describe('initialisation from URL params', () => {
		it('returns default params when no URL query params are present', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			expect(result.current.dashboardsListQueryParams).toEqual({
				columnKey: 'updatedAt',
				order: 'descend',
				page: '1',
				search: '',
			});
		});

		it('reads valid columnKey, order, page and search from the URL', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper(
					'/dashboard?columnKey=createdAt&order=ascend&page=3&search=foo',
				),
			});

			expect(result.current.dashboardsListQueryParams).toEqual({
				columnKey: 'createdAt',
				order: 'ascend',
				page: '3',
				search: 'foo',
			});
		});

		it('falls back to updatedAt for an unsupported columnKey', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard?columnKey=name&order=ascend'),
			});

			expect(result.current.dashboardsListQueryParams.columnKey).toBe('updatedAt');
		});

		it('falls back to descend for an unsupported order', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard?columnKey=createdAt&order=invalid'),
			});

			expect(result.current.dashboardsListQueryParams.order).toBe('descend');
		});

		it('defaults page to 1 when page param is absent', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			expect(result.current.dashboardsListQueryParams.page).toBe('1');
		});

		it('defaults search to empty string when search param is absent', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			expect(result.current.dashboardsListQueryParams.search).toBe('');
		});
	});

	describe('updateDashboardsListQueryParams', () => {
		it('updates the state when params change', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			const updated: IDashboardsListQueryParams = {
				columnKey: 'createdAt',
				order: 'ascend',
				page: '2',
				search: 'signoz',
			};

			act(() => {
				result.current.updateDashboardsListQueryParams(updated);
			});

			expect(result.current.dashboardsListQueryParams).toEqual(updated);
		});

		it('does not update state when params are identical', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			const initial = result.current.dashboardsListQueryParams;

			act(() => {
				result.current.updateDashboardsListQueryParams({ ...initial });
			});

			// Reference equality confirms no re-render-triggering state update.
			expect(result.current.dashboardsListQueryParams).toBe(initial);
		});

		it('calls safeNavigate with the updated search string', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			const updated: IDashboardsListQueryParams = {
				columnKey: 'createdAt',
				order: 'ascend',
				page: '2',
				search: 'test',
			};

			act(() => {
				result.current.updateDashboardsListQueryParams(updated);
			});

			expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
			const [navigateArg] = mockSafeNavigate.mock.calls[0];
			const searchParams = new URLSearchParams(navigateArg.search);
			expect(searchParams.get('columnKey')).toBe('createdAt');
			expect(searchParams.get('order')).toBe('ascend');
			expect(searchParams.get('page')).toBe('2');
			expect(searchParams.get('search')).toBe('test');
		});

		it('persists params to sessionStorage', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			const updated: IDashboardsListQueryParams = {
				columnKey: 'updatedAt',
				order: 'descend',
				page: '1',
				search: 'signoz',
			};

			act(() => {
				result.current.updateDashboardsListQueryParams(updated);
			});

			const stored = sessionStorage.getItem(
				DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
			);
			const storedParams = Object.fromEntries(
				new URLSearchParams(stored || '').entries(),
			);
			expect(storedParams).toEqual(updated);
		});

		it('still calls safeNavigate even when params are unchanged', () => {
			const { result } = renderHook(() => useDashboardsListQueryParams(), {
				wrapper: createTestWrapper('/dashboard'),
			});

			const initial = result.current.dashboardsListQueryParams;

			act(() => {
				result.current.updateDashboardsListQueryParams({ ...initial });
			});

			expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
		});
	});
});
