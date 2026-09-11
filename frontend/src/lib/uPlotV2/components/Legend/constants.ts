/** Widest a single legend item is allowed to get when sizing the legend grid. */
export const MAX_LEGEND_WIDTH = 240;

/**
 * Enough for a row to contain its own hover actions, which a short label would
 * otherwise size a column too narrow for. Little room for the label is intended.
 */
export const MIN_LEGEND_ITEM_WIDTH = 110;

/** Marker + row padding, on top of the estimated label width. */
export const LEGEND_ITEM_EXTRA_WIDTH = 16;

/** Must match `.row`'s height and the grid's row gap, or the reserved
 * rectangle clips a row. */
export const LEGEND_ROW_HEIGHT = 28;
export const LEGEND_ROW_GAP = 2;
export const LEGEND_MAX_BOTTOM_ROWS = 2;

/** Hover delay before a row's full-name tooltip opens. */
export const LEGEND_TOOLTIP_DELAY_MS = 500;
