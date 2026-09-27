import { GRID_COLS } from '../../../patchOps';

export const GRID_ROW_HEIGHT = 45;
/** Gap between items, also used as the grid's container padding. */
export const GRID_MARGIN = 8;

/** CSS width of an item spanning `cols` columns, inside the grid's container padding. */
export function gridItemWidth(cols: number): string {
	const fraction = cols / GRID_COLS;
	const offset = (cols - 1 - fraction * (GRID_COLS - 1)) * GRID_MARGIN;
	return `calc(${fraction * 100}% ${offset < 0 ? '-' : '+'} ${Math.abs(offset)}px)`;
}

export function gridItemHeight(rows: number): number {
	return rows * GRID_ROW_HEIGHT + (rows - 1) * GRID_MARGIN;
}
