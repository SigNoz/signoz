import { act, renderHook } from '@testing-library/react';

import { useTableParams } from '../useTableParams';

jest.mock('utils/nuqsParsers', () => ({
	parseAsJsonNoValidate: (): any => ({
		withDefault: (d: unknown): any => ({
			withOptions: (): any => ({ _default: d }),
			_default: d,
		}),
	}),
}));

jest.mock('nuqs', () => ({
	parseAsInteger: {
		withDefault: (d: number): any => ({
			withOptions: (): any => ({ _default: d }),
			_default: d,
		}),
	},
	parseAsJson: (): any => ({
		withDefault: (d: unknown): any => ({
			withOptions: (): any => ({ _default: d }),
			_default: d,
		}),
	}),
	useQueryState: jest
		.fn()
		.mockImplementation((_key: string, parser: { _default: unknown }) => {
			const [val, setVal] = (jest.requireActual(
				'react',
			) as typeof import('react')).useState(parser?._default);
			return [val, setVal];
		}),
}));

describe('useTableParams (local mode — enableQueryParams not set)', () => {
	it('returns default page=1 and limit=50', () => {
		const { result } = renderHook(() => useTableParams());
		expect(result.current.page).toBe(1);
		expect(result.current.limit).toBe(50);
		expect(result.current.orderBy).toBeNull();
	});

	it('respects custom defaults', () => {
		const { result } = renderHook(() =>
			useTableParams(undefined, { page: 2, limit: 25 }),
		);
		expect(result.current.page).toBe(2);
		expect(result.current.limit).toBe(25);
	});

	it('setPage updates page', () => {
		const { result } = renderHook(() => useTableParams());
		act(() => {
			result.current.setPage(3);
		});
		expect(result.current.page).toBe(3);
	});

	it('setLimit updates limit', () => {
		const { result } = renderHook(() => useTableParams());
		act(() => {
			result.current.setLimit(100);
		});
		expect(result.current.limit).toBe(100);
	});

	it('setOrderBy updates orderBy', () => {
		const { result } = renderHook(() => useTableParams());
		act(() => {
			result.current.setOrderBy({ columnId: 'cpu', desc: true });
		});
		expect(result.current.orderBy).toEqual({ columnId: 'cpu', desc: true });
	});
});

describe('useTableParams (URL mode — enableQueryParams set)', () => {
	it('uses nuqs state when enableQueryParams=true', () => {
		const { result } = renderHook(() => useTableParams(true));
		expect(result.current.page).toBe(1);
		act(() => {
			result.current.setPage(5);
		});
		expect(result.current.page).toBe(5);
	});

	it('uses prefixed keys when enableQueryParams is a string', () => {
		const { result } = renderHook(() => useTableParams('pods', { page: 2 }));
		expect(result.current.page).toBe(2);
		act(() => {
			result.current.setPage(4);
		});
		expect(result.current.page).toBe(4);
	});

	it('local state is ignored when enableQueryParams is set', () => {
		const { result: local } = renderHook(() => useTableParams());
		const { result: url } = renderHook(() => useTableParams(true));
		act(() => {
			local.current.setPage(99);
		});
		expect(url.current.page).toBe(1);
	});
});
