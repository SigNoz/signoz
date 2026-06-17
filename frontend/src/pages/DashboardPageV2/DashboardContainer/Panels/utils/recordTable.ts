// Shared chrome for the antd-table panel kinds (Table, List): page-size/scroll
// sizing from the measured panel, and the header search-box row filter. Both
// kinds render record rows in an antd Table, so this lives here rather than in
// any one kind's folder.

// antd small-table row / header / pagination heights (px), used to estimate how
// many rows fit the panel so each page roughly fills the available space.
const ROW_HEIGHT = 39;
const HEADER_HEIGHT = 39;
const PAGINATION_HEIGHT = 56;

export const MIN_PAGE_SIZE = 10;

export interface TableLayout {
	/** Rows per page — at least MIN_PAGE_SIZE, otherwise as many as fit. */
	pageSize: number;
	/** tbody scroll height that keeps the header pinned; undefined before measure. */
	scrollY: number | undefined;
}

/**
 * Derives the table's page size and scroll body from the panel's measured
 * height: reserve the header + pagination, then fit whole rows into what's left
 * (never fewer than MIN_PAGE_SIZE). Before the panel is measured (`height` 0),
 * fall back to the minimum page size and let the body render at natural height.
 */
export function computeTableLayout(height: number): TableLayout {
	if (!height) {
		return { pageSize: MIN_PAGE_SIZE, scrollY: undefined };
	}
	const body = Math.max(ROW_HEIGHT, height - HEADER_HEIGHT - PAGINATION_HEIGHT);
	return {
		pageSize: Math.max(MIN_PAGE_SIZE, Math.floor(body / ROW_HEIGHT)),
		scrollY: body,
	};
}

/**
 * Client-side row filter for the header search box (V1 parity): keeps a row when
 * any cell's stringified value contains `term`, case-insensitively. The synthetic
 * antd `key` is skipped so row indices never match. An empty term is a no-op and
 * returns the original array (stable reference for memoization).
 */
export function filterTableRows<T extends Record<string, unknown>>(
	rows: T[],
	term: string,
): T[] {
	const needle = term.trim().toLowerCase();
	if (!needle) {
		return rows;
	}
	return rows.filter((row) =>
		Object.entries(row).some(
			([key, value]) =>
				key !== 'key' && String(value).toLowerCase().includes(needle),
		),
	);
}
