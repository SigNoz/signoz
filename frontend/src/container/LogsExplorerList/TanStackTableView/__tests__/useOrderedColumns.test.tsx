import { act, renderHook } from '@testing-library/react';

import type { OrderedColumn } from '../types';
import { useOrderedColumns } from '../useOrderedColumns';

const mockGetDraggedColumns = jest.fn();

jest.mock('hooks/useDragColumns/utils', () => ({
	getDraggedColumns: <T,>(current: unknown[], dragged: unknown[]): T[] =>
		mockGetDraggedColumns(current, dragged) as T[],
}));

const col = (key: string, title?: string): OrderedColumn =>
	({ key, title: title ?? key } as OrderedColumn);

describe('useOrderedColumns', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns columns from getDraggedColumns filtered to keys with string or number', () => {
		mockGetDraggedColumns.mockReturnValue([
			col('body'),
			col('timestamp'),
			{ title: 'no-key' },
		]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange: jest.fn(),
			}),
		);

		expect(result.current.orderedColumns).toEqual([
			col('body'),
			col('timestamp'),
		]);
		expect(result.current.orderedColumnIds).toEqual(['body', 'timestamp']);
	});

	it('hasSingleColumn is true when exactly one column is not state-indicator', () => {
		mockGetDraggedColumns.mockReturnValue([col('state-indicator'), col('body')]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange: jest.fn(),
			}),
		);

		expect(result.current.hasSingleColumn).toBe(true);
	});

	it('hasSingleColumn is false when more than one non-state-indicator column exists', () => {
		mockGetDraggedColumns.mockReturnValue([
			col('state-indicator'),
			col('body'),
			col('timestamp'),
		]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange: jest.fn(),
			}),
		);

		expect(result.current.hasSingleColumn).toBe(false);
	});

	it('handleDragEnd reorders columns and calls onColumnOrderChange', () => {
		const onColumnOrderChange = jest.fn();
		mockGetDraggedColumns.mockReturnValue([col('a'), col('b'), col('c')]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange,
			}),
		);

		act(() => {
			result.current.handleDragEnd({
				active: { id: 'a' },
				over: { id: 'c' },
			} as never);
		});

		expect(onColumnOrderChange).toHaveBeenCalledWith([
			expect.objectContaining({ key: 'b' }),
			expect.objectContaining({ key: 'c' }),
			expect.objectContaining({ key: 'a' }),
		]);

		// Derived-only: orderedColumns should remain until draggedColumns (URL/localStorage) updates.
		expect(result.current.orderedColumns.map((c) => c.key)).toEqual([
			'a',
			'b',
			'c',
		]);
	});

	it('handleDragEnd no-ops when over is null', () => {
		const onColumnOrderChange = jest.fn();
		mockGetDraggedColumns.mockReturnValue([col('a'), col('b')]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange,
			}),
		);

		const before = result.current.orderedColumns;

		act(() => {
			result.current.handleDragEnd({
				active: { id: 'a' },
				over: null,
			} as never);
		});

		expect(result.current.orderedColumns).toBe(before);
		expect(onColumnOrderChange).not.toHaveBeenCalled();
	});

	it('handleDragEnd no-ops when active.id equals over.id', () => {
		const onColumnOrderChange = jest.fn();
		mockGetDraggedColumns.mockReturnValue([col('a'), col('b')]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange,
			}),
		);

		act(() => {
			result.current.handleDragEnd({
				active: { id: 'a' },
				over: { id: 'a' },
			} as never);
		});

		expect(onColumnOrderChange).not.toHaveBeenCalled();
	});

	it('handleDragEnd no-ops when indices cannot be resolved', () => {
		const onColumnOrderChange = jest.fn();
		mockGetDraggedColumns.mockReturnValue([col('a'), col('b')]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange,
			}),
		);

		act(() => {
			result.current.handleDragEnd({
				active: { id: 'missing' },
				over: { id: 'a' },
			} as never);
		});

		expect(onColumnOrderChange).not.toHaveBeenCalled();
	});

	it('exposes sensors from useSensors', () => {
		mockGetDraggedColumns.mockReturnValue([col('a')]);

		const { result } = renderHook(() =>
			useOrderedColumns({
				columns: [],
				draggedColumns: [],
				onColumnOrderChange: jest.fn(),
			}),
		);

		expect(result.current.sensors).toBeDefined();
	});

	it('syncs ordered columns when base order changes externally (e.g. URL / localStorage)', () => {
		mockGetDraggedColumns.mockReturnValue([col('a'), col('b'), col('c')]);

		const { result, rerender } = renderHook(
			({ draggedColumns }: { draggedColumns: unknown[] }) =>
				useOrderedColumns({
					columns: [],
					draggedColumns,
					onColumnOrderChange: jest.fn(),
				}),
			{ initialProps: { draggedColumns: [] as unknown[] } },
		);

		expect(result.current.orderedColumns.map((column) => column.key)).toEqual([
			'a',
			'b',
			'c',
		]);

		mockGetDraggedColumns.mockReturnValue([col('c'), col('b'), col('a')]);

		act(() => {
			rerender({ draggedColumns: [{ title: 'from-url' }] as unknown[] });
		});

		expect(result.current.orderedColumns.map((column) => column.key)).toEqual([
			'c',
			'b',
			'a',
		]);
	});
});
