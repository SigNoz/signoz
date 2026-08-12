/**
 * A table row: the span's flattened attributes. Which keys are present depends
 * on the query and the selected columns, so every field access has to tolerate
 * `undefined` — including the skeleton placeholder rows the table renders
 * before the first response lands.
 */
export type TraceListRow = Record<string, unknown>;

/**
 * Renders a dynamic row value as text. Values are whatever the span carried, so
 * objects (a JSON body, say) are serialised rather than left to stringify to
 * `[object Object]`.
 */
export const formatCellValue = (value: unknown): string => {
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (value !== null && typeof value === 'object') {
		return JSON.stringify(value);
	}
	return '';
};
