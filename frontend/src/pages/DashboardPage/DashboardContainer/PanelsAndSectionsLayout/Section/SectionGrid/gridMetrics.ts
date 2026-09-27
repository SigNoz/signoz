export const GRID_ROW_HEIGHT = 45;
/** Gap between items, also used as the grid's container padding. */
export const GRID_MARGIN = 8;

/** Pixel height react-grid-layout gives a grid whose items span `rows` rows. */
export function gridHeight(rows: number): number {
	return rows * GRID_ROW_HEIGHT + (rows + 1) * GRID_MARGIN;
}
