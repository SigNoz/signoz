import { TableColumnDef } from './types';

export const getColumnId = <TData>(column: TableColumnDef<TData>): string =>
	column.id;

const REM_PX = 16;
const MIN_WIDTH_DEFAULT_REM = 12;

export const getColumnMinWidthPx = <TData>(
	column: TableColumnDef<TData>,
): number => {
	if (column.width?.fixed != null) {
		return column.width.fixed;
	}
	if (column.width?.min != null) {
		return column.width.min;
	}
	return MIN_WIDTH_DEFAULT_REM * REM_PX;
};
