import type { TracesTableRow } from './getFieldColumn';

export function stringifyCellValue(value: unknown): string {
	if (value == null) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}

/**
 * The list API returns no total, so a full page counts one row past itself:
 * the pager offers the next page only while the last one came back full.
 */
export function getRollingTotal(
	offset: number,
	rowCount: number,
	limit: number,
): number {
	return offset + rowCount + (rowCount >= limit ? 1 : 0);
}

/** The API can return the same span twice; the table suffixes repeated keys so each row hovers on its own. */
export function getRowKey(row: TracesTableRow): string {
	return row.id;
}
