/* eslint-disable no-restricted-syntax */
import { act, renderHook } from '@testing-library/react';

import {
	useColumnOrder,
	useColumnSizing,
	useColumnStore,
	useHiddenColumnIds,
} from '../useColumnStore';

const TEST_KEY = 'test-table';

describe('useColumnStore', () => {
	beforeEach(() => {
		useColumnStore.getState().tables = {};
		localStorage.clear();
	});

	describe('initializeFromDefaults', () => {
		it('initializes hidden columns from defaultVisibility: false', () => {
			const columns = [
				{ id: 'a', defaultVisibility: true },
				{ id: 'b', defaultVisibility: false },
				{ id: 'c' }, // defaults to visible
			];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns as any);
			});

			const state = useColumnStore.getState().tables[TEST_KEY];
			expect(state.hiddenColumnIds).toStrictEqual(['b']);
			expect(state.columnOrder).toStrictEqual([]);
			expect(state.columnSizing).toStrictEqual({});
		});

		it('does not reinitialize if already exists', () => {
			act(() => {
				useColumnStore
					.getState()
					.initializeFromDefaults(TEST_KEY, [
						{ id: 'a', defaultVisibility: false },
					] as any);
				useColumnStore.getState().hideColumn(TEST_KEY, 'x');
				useColumnStore
					.getState()
					.initializeFromDefaults(TEST_KEY, [
						{ id: 'b', defaultVisibility: false },
					] as any);
			});

			const state = useColumnStore.getState().tables[TEST_KEY];
			expect(state.hiddenColumnIds).toContain('a');
			expect(state.hiddenColumnIds).toContain('x');
			expect(state.hiddenColumnIds).not.toContain('b');
		});
	});

	describe('hideColumn / showColumn / toggleColumn', () => {
		beforeEach(() => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
			});
		});

		it('hideColumn adds to hiddenColumnIds', () => {
			act(() => {
				useColumnStore.getState().hideColumn(TEST_KEY, 'col1');
			});
			expect(useColumnStore.getState().tables[TEST_KEY].hiddenColumnIds).toContain(
				'col1',
			);
		});

		it('hideColumn is idempotent', () => {
			act(() => {
				useColumnStore.getState().hideColumn(TEST_KEY, 'col1');
				useColumnStore.getState().hideColumn(TEST_KEY, 'col1');
			});
			expect(
				useColumnStore
					.getState()
					.tables[TEST_KEY].hiddenColumnIds.filter((id) => id === 'col1'),
			).toHaveLength(1);
		});

		it('showColumn removes from hiddenColumnIds', () => {
			act(() => {
				useColumnStore.getState().hideColumn(TEST_KEY, 'col1');
				useColumnStore.getState().showColumn(TEST_KEY, 'col1');
			});
			expect(
				useColumnStore.getState().tables[TEST_KEY].hiddenColumnIds,
			).not.toContain('col1');
		});

		it('toggleColumn toggles visibility', () => {
			act(() => {
				useColumnStore.getState().toggleColumn(TEST_KEY, 'col1');
			});
			expect(useColumnStore.getState().tables[TEST_KEY].hiddenColumnIds).toContain(
				'col1',
			);

			act(() => {
				useColumnStore.getState().toggleColumn(TEST_KEY, 'col1');
			});
			expect(
				useColumnStore.getState().tables[TEST_KEY].hiddenColumnIds,
			).not.toContain('col1');
		});
	});

	describe('setColumnSizing', () => {
		beforeEach(() => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
			});
		});

		it('updates column sizing', () => {
			act(() => {
				useColumnStore
					.getState()
					.setColumnSizing(TEST_KEY, { col1: 200, col2: 300 });
			});
			expect(
				useColumnStore.getState().tables[TEST_KEY].columnSizing,
			).toStrictEqual({
				col1: 200,
				col2: 300,
			});
		});
	});

	describe('setColumnOrder', () => {
		beforeEach(() => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
			});
		});

		it('updates column order', () => {
			act(() => {
				useColumnStore
					.getState()
					.setColumnOrder(TEST_KEY, ['col2', 'col1', 'col3']);
			});
			expect(useColumnStore.getState().tables[TEST_KEY].columnOrder).toStrictEqual(
				['col2', 'col1', 'col3'],
			);
		});
	});

	describe('resetToDefaults', () => {
		it('resets to column defaults', () => {
			const columns = [
				{ id: 'a', defaultVisibility: false },
				{ id: 'b', defaultVisibility: true },
			];

			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, columns as any);
				useColumnStore.getState().showColumn(TEST_KEY, 'a');
				useColumnStore.getState().hideColumn(TEST_KEY, 'b');
				useColumnStore.getState().setColumnOrder(TEST_KEY, ['b', 'a']);
				useColumnStore.getState().setColumnSizing(TEST_KEY, { a: 100 });
			});

			act(() => {
				useColumnStore.getState().resetToDefaults(TEST_KEY, columns as any);
			});

			const state = useColumnStore.getState().tables[TEST_KEY];
			expect(state.hiddenColumnIds).toStrictEqual(['a']);
			expect(state.columnOrder).toStrictEqual([]);
			expect(state.columnSizing).toStrictEqual({});
		});
	});

	describe('cleanupStaleHiddenColumns', () => {
		it('removes hidden column IDs that are not in validColumnIds', () => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
				useColumnStore.getState().hideColumn(TEST_KEY, 'col1');
				useColumnStore.getState().hideColumn(TEST_KEY, 'col2');
				useColumnStore.getState().hideColumn(TEST_KEY, 'col3');
			});

			// Only col1 and col3 are valid now
			act(() => {
				useColumnStore
					.getState()
					.cleanupStaleHiddenColumns(TEST_KEY, new Set(['col1', 'col3']));
			});

			const state = useColumnStore.getState().tables[TEST_KEY];
			expect(state.hiddenColumnIds).toStrictEqual(['col1', 'col3']);
			expect(state.hiddenColumnIds).not.toContain('col2');
		});

		it('does nothing when all hidden columns are valid', () => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
				useColumnStore.getState().hideColumn(TEST_KEY, 'col1');
				useColumnStore.getState().hideColumn(TEST_KEY, 'col2');
			});

			const stateBefore = useColumnStore.getState().tables[TEST_KEY];
			const hiddenBefore = [...stateBefore.hiddenColumnIds];

			act(() => {
				useColumnStore
					.getState()
					.cleanupStaleHiddenColumns(TEST_KEY, new Set(['col1', 'col2', 'col3']));
			});

			const stateAfter = useColumnStore.getState().tables[TEST_KEY];
			expect(stateAfter.hiddenColumnIds).toStrictEqual(hiddenBefore);
		});

		it('does nothing for unknown storage key', () => {
			act(() => {
				useColumnStore
					.getState()
					.cleanupStaleHiddenColumns('unknown-key', new Set(['col1']));
			});

			// Should not throw or create state
			expect(useColumnStore.getState().tables['unknown-key']).toBeUndefined();
		});
	});

	describe('selector hooks', () => {
		it('useHiddenColumnIds returns hidden columns', () => {
			act(() => {
				useColumnStore
					.getState()
					.initializeFromDefaults(TEST_KEY, [
						{ id: 'a', defaultVisibility: false },
					] as any);
			});

			const { result } = renderHook(() => useHiddenColumnIds(TEST_KEY));
			expect(result.current).toStrictEqual(['a']);
		});

		it('useHiddenColumnIds returns a stable snapshot for persisted state', () => {
			localStorage.setItem(
				'@signoz/table-columns/test-table',
				JSON.stringify({
					hiddenColumnIds: ['persisted'],
					columnOrder: [],
					columnSizing: {},
				}),
			);

			const { result, rerender } = renderHook(() => useHiddenColumnIds(TEST_KEY));
			const firstSnapshot = result.current;

			rerender();

			expect(result.current).toBe(firstSnapshot);
		});

		it('useColumnSizing returns sizing', () => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
				useColumnStore.getState().setColumnSizing(TEST_KEY, { col1: 150 });
			});

			const { result } = renderHook(() => useColumnSizing(TEST_KEY));
			expect(result.current).toStrictEqual({ col1: 150 });
		});

		it('useColumnOrder returns order', () => {
			act(() => {
				useColumnStore.getState().initializeFromDefaults(TEST_KEY, []);
				useColumnStore.getState().setColumnOrder(TEST_KEY, ['c', 'b', 'a']);
			});

			const { result } = renderHook(() => useColumnOrder(TEST_KEY));
			expect(result.current).toStrictEqual(['c', 'b', 'a']);
		});

		it('returns empty defaults for unknown storageKey', () => {
			const { result: hidden } = renderHook(() => useHiddenColumnIds('unknown'));
			const { result: sizing } = renderHook(() => useColumnSizing('unknown'));
			const { result: order } = renderHook(() => useColumnOrder('unknown'));

			expect(hidden.current).toStrictEqual([]);
			expect(sizing.current).toStrictEqual({});
			expect(order.current).toStrictEqual([]);
		});
	});
});
