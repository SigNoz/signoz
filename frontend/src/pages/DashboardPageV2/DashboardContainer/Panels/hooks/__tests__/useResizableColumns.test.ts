import { act, renderHook } from '@testing-library/react';
import type { ColumnsType } from 'antd/es/table';
import type { ResizeCallbackData } from 'react-resizable';

import {
	readColumnWidths,
	writeColumnWidths,
} from '../../utils/columnWidthStorage';
import { useResizableColumns } from '../useResizableColumns';

type Row = { key: string; name: string };

const COLUMNS: ColumnsType<Row> = [
	{ title: 'Name', dataIndex: 'name', key: 'name' },
	{ title: 'Status', dataIndex: 'status', key: 'status' },
];

// Invokes a column's resize handler the way antd's header cell would.
function resize(column: ColumnsType<Row>[number], width: number): void {
	const headerProps = (
		column.onHeaderCell as (c: unknown) => {
			onResize?: (e: unknown, data: ResizeCallbackData) => void;
		}
	)(column);
	headerProps.onResize?.({}, {
		size: { width, height: 0 },
	} as ResizeCallbackData);
}

describe('useResizableColumns', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('falls back to the default width when nothing is stored', () => {
		const { result } = renderHook(() =>
			useResizableColumns<Row>({ panelId: 'p1', columns: COLUMNS }),
		);
		expect(result.current.columns.map((c) => c.width)).toStrictEqual([180, 180]);
	});

	it('leaves a flex column width-less (no default) so it fills remaining space', () => {
		const { result } = renderHook(() =>
			useResizableColumns<Row>({
				panelId: 'p1',
				columns: COLUMNS,
				flexColumns: ['status'],
			}),
		);
		const widths = Object.fromEntries(
			result.current.columns.map((c) => [c.key, c.width]),
		);
		// name gets the default; the flex column stays undefined.
		expect(widths).toStrictEqual({ name: 180, status: undefined });
	});

	it('honors a stored width on a flex column once the user resizes it', () => {
		writeColumnWidths('p1', { status: 300 });
		const { result } = renderHook(() =>
			useResizableColumns<Row>({
				panelId: 'p1',
				columns: COLUMNS,
				flexColumns: ['status'],
			}),
		);
		const widths = Object.fromEntries(
			result.current.columns.map((c) => [c.key, c.width]),
		);
		expect(widths).toStrictEqual({ name: 180, status: 300 });
	});

	it('seeds a column with its stored width', () => {
		writeColumnWidths('p1', { name: 250 });
		const { result } = renderHook(() =>
			useResizableColumns<Row>({ panelId: 'p1', columns: COLUMNS }),
		);
		const widths = Object.fromEntries(
			result.current.columns.map((c) => [c.key, c.width]),
		);
		expect(widths).toStrictEqual({ name: 250, status: 180 });
	});

	it('updates the width on resize and persists it (debounced)', () => {
		jest.useFakeTimers();
		try {
			const { result } = renderHook(() =>
				useResizableColumns<Row>({ panelId: 'p1', columns: COLUMNS }),
			);

			act(() => resize(result.current.columns[0], 321));

			expect(result.current.columns[0].width).toBe(321);
			// Not yet flushed to storage.
			expect(readColumnWidths('p1')).toStrictEqual({});

			act(() => jest.advanceTimersByTime(400));
			expect(readColumnWidths('p1')).toStrictEqual({ name: 321 });
		} finally {
			jest.useRealTimers();
		}
	});
});
