/* eslint-disable no-restricted-syntax */
import { act, renderHook } from '@testing-library/react';

import { TableColumnDef } from '../types';
import { useColumnState } from '../useColumnState';
import { useColumnStore } from '../useColumnStore';

const TEST_KEY = 'test-state';

type TestRow = { id: string; name: string };

const col = (
	id: string,
	overrides: Partial<TableColumnDef<TestRow>> = {},
): TableColumnDef<TestRow> => ({
	id,
	header: id,
	cell: (): null => null,
	...overrides,
});

describe('useColumnState', () => {
	beforeEach(() => {
		useColumnStore.setState({ tables: {} });
		localStorage.clear();
	});

	describe('initialization', () => {
		it('initializes store from column defaults on mount', () => {
			const columns = [
				col('a', { defaultVisibility: true }),
				col('b', { defaultVisibility: false }),
				col('c'),
			];

			renderHook(() => useColumnState({ storageKey: TEST_KEY, columns }));

			const state = useColumnStore.getState().tables[TEST_KEY];
			expect(state.hiddenColumnIds).toStrictEqual(['b']);
		});

		it('does not initialize without storageKey', () => {
			const columns = [col('a', { defaultVisibility: false })];

			renderHook(() => useColumnState({ columns }));

			expect(useColumnStore.getState().tables[TEST_KEY]).toBeUndefined();
		});
	});

	describe('columnVisibility', () => {
		it('returns visibility state from hidden columns', () => {
			const columns = [col('a'), col('b'), col('c')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
				useColumnStore.getState().hideColumn(TEST_KEY, 'b');
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			expect(result.current.columnVisibility).toStrictEqual({ b: false });
		});

		it('applies visibilityBehavior for grouped state', () => {
			const columns = [
				col('ungrouped', { visibilityBehavior: 'hidden-on-expand' }),
				col('grouped', { visibilityBehavior: 'hidden-on-collapse' }),
				col('always'),
			];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
			});

			// Not grouped
			const { result: notGrouped } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns, isGrouped: false }),
			);
			expect(notGrouped.current.columnVisibility).toStrictEqual({
				grouped: false,
			});

			// Grouped
			const { result: grouped } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns, isGrouped: true }),
			);
			expect(grouped.current.columnVisibility).toStrictEqual({ ungrouped: false });
		});

		it('combines store hidden + visibilityBehavior', () => {
			const columns = [
				col('a', { visibilityBehavior: 'hidden-on-expand' }),
				col('b'),
			];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
				useColumnStore.getState().hideColumn(TEST_KEY, 'b');
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns, isGrouped: true }),
			);

			expect(result.current.columnVisibility).toStrictEqual({
				a: false,
				b: false,
			});
		});
	});

	describe('sortedColumns', () => {
		it('returns columns in original order when no order set', () => {
			const columns = [col('a'), col('b'), col('c')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			expect(result.current.sortedColumns.map((c) => c.id)).toStrictEqual([
				'a',
				'b',
				'c',
			]);
		});

		it('returns columns sorted by stored order', () => {
			const columns = [col('a'), col('b'), col('c')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
				useColumnStore.getState().setColumnOrder(TEST_KEY, ['c', 'a', 'b']);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			expect(result.current.sortedColumns.map((c) => c.id)).toStrictEqual([
				'c',
				'a',
				'b',
			]);
		});

		it('keeps pinned columns at the start', () => {
			const columns = [col('a'), col('pinned', { pin: 'left' }), col('b')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
				useColumnStore.getState().setColumnOrder(TEST_KEY, ['b', 'a']);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			expect(result.current.sortedColumns.map((c) => c.id)).toStrictEqual([
				'pinned',
				'b',
				'a',
			]);
		});
	});

	describe('actions', () => {
		it('hideColumn hides a column', () => {
			const columns = [col('a'), col('b')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			act(() => {
				result.current.hideColumn('a');
			});

			expect(result.current.columnVisibility).toStrictEqual({ a: false });
		});

		it('showColumn shows a column', () => {
			const columns = [col('a', { defaultVisibility: false })];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			expect(result.current.columnVisibility).toStrictEqual({ a: false });

			act(() => {
				result.current.showColumn('a');
			});

			expect(result.current.columnVisibility).toStrictEqual({});
		});

		it('setColumnSizing updates sizing', () => {
			const columns = [col('a')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			act(() => {
				result.current.setColumnSizing({ a: 200 });
			});

			expect(result.current.columnSizing).toStrictEqual({ a: 200 });
		});

		it('setColumnOrder updates order from column array', () => {
			const columns = [col('a'), col('b'), col('c')];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns);
			});

			const { result } = renderHook(() =>
				useColumnState({ storageKey: TEST_KEY, columns }),
			);

			act(() => {
				result.current.setColumnOrder([col('c'), col('a'), col('b')]);
			});

			expect(result.current.sortedColumns.map((c) => c.id)).toStrictEqual([
				'c',
				'a',
				'b',
			]);
		});
	});
});
