import { TableProps } from 'antd';

type ColumnWidths = Record<string, number>;

export interface ResizeTableProps extends TableProps<any> {
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
	/**
	 * Pre-resolved column widths for this table, keyed by column dataIndex.
	 * Use this to apply persisted widths on mount (e.g. from widget.columnWidths).
	 * Do NOT pass a value that updates reactively on every resize — that creates a
	 * feedback loop. Pass only stable / persisted values.
	 */
	columnWidths?: ColumnWidths;
	/**
	 * Called (debounced) whenever the user finishes resizing a column.
	 * The widths object contains all current column widths keyed by dataIndex.
	 * Intended for persisting widths to an external store (e.g. dashboard context
	 * staging buffer). The caller owns the storage; ResizeTable does not read back
	 * whatever is written here.
	 */
	onColumnWidthsChange?: (widths: ColumnWidths) => void;
}
