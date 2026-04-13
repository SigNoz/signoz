import { act, renderHook } from '@testing-library/react';

import type { TableColumnDef } from '../types';
import { useTableColumns } from '../useTableColumns';

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: (key: string): string | null => mockGet(key),
}));

jest.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: (key: string, value: string): void => mockSet(key, value),
}));

type Row = { id: string; name: string };

const col = (id: string, pin?: 'left' | 'right'): TableColumnDef<Row> => ({
	id,
	header: id,
	cell: ({ value }): string => String(value),
	...(pin ? { pin } : {}),
});

describe('useTableColumns', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGet.mockReturnValue(null);
		jest.useFakeTimers();
	});
	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('returns definitions in original order when no persisted state', () => {
		const defs = [col('timestamp'), col('body'), col('name')];
		const { result } = renderHook(() => useTableColumns(defs));
		expect(result.current.tableProps.columns.map((c) => c.id)).toEqual([
			'timestamp',
			'body',
			'name',
		]);
	});

	it('restores column order from localStorage', () => {
		mockGet.mockReturnValue(
			JSON.stringify({
				columnOrder: ['name', 'body', 'timestamp'],
				columnSizing: {},
				removedColumnIds: [],
			}),
		);
		const defs = [col('timestamp'), col('body'), col('name')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);
		expect(result.current.tableProps.columns.map((c) => c.id)).toEqual([
			'name',
			'body',
			'timestamp',
		]);
	});

	it('pinned columns always stay first regardless of persisted order', () => {
		mockGet.mockReturnValue(
			JSON.stringify({
				columnOrder: ['body', 'indicator'],
				columnSizing: {},
				removedColumnIds: [],
			}),
		);
		const defs = [col('indicator', 'left'), col('body')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);
		expect(result.current.tableProps.columns[0].id).toBe('indicator');
	});

	it('excludes removed columns from tableProps.columns', () => {
		mockGet.mockReturnValue(
			JSON.stringify({
				columnOrder: [],
				columnSizing: {},
				removedColumnIds: ['name'],
			}),
		);
		const defs = [col('body'), col('name')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);
		expect(result.current.tableProps.columns.map((c) => c.id)).toEqual(['body']);
		expect(result.current.activeColumnIds).toEqual(['body']);
	});

	it('activeColumnIds reflects only currently visible columns', () => {
		const defs = [col('body'), col('timestamp'), col('name')];
		const { result } = renderHook(() => useTableColumns(defs));
		expect(result.current.activeColumnIds).toEqual(['body', 'timestamp', 'name']);
	});

	it('onRemoveColumn removes column and persists after debounce', () => {
		const defs = [col('body'), col('name')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);

		act(() => {
			result.current.tableProps.onRemoveColumn('body');
		});

		expect(result.current.tableProps.columns.map((c) => c.id)).toEqual(['name']);

		act(() => {
			jest.advanceTimersByTime(250);
		});

		expect(mockSet).toHaveBeenCalledWith(
			'test_table',
			expect.stringContaining('"removedColumnIds":["body"]'),
		);
	});

	it('onColumnOrderChange updates column order', () => {
		const defs = [col('a'), col('b'), col('c')];
		const { result } = renderHook(() => useTableColumns(defs));

		act(() => {
			result.current.tableProps.onColumnOrderChange([
				col('c'),
				col('b'),
				col('a'),
			]);
		});

		expect(result.current.tableProps.columns.map((c) => c.id)).toEqual([
			'c',
			'b',
			'a',
		]);
	});

	it('restores column sizing from localStorage', () => {
		mockGet.mockReturnValue(
			JSON.stringify({
				columnOrder: [],
				columnSizing: { body: 400 },
				removedColumnIds: [],
			}),
		);
		const defs = [col('body')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);
		expect(result.current.tableProps.columnSizing).toEqual({ body: 400 });
	});

	it('debounces sizing writes to localStorage', () => {
		const defs = [col('body')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);

		act(() => {
			result.current.tableProps.onColumnSizingChange({ body: 500 });
		});
		expect(mockSet).not.toHaveBeenCalled();

		act(() => {
			jest.advanceTimersByTime(250);
		});
		expect(mockSet).toHaveBeenCalledWith(
			'test_table',
			expect.stringContaining('"body":500'),
		);
	});

	it('falls back to definitions order when localStorage is corrupt', () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
		mockGet.mockReturnValue('not-json');
		const defs = [col('a'), col('b')];
		const { result } = renderHook(() =>
			useTableColumns(defs, { storageKey: 'test_table' }),
		);
		expect(result.current.tableProps.columns.map((c) => c.id)).toEqual([
			'a',
			'b',
		]);
		spy.mockRestore();
	});
});
