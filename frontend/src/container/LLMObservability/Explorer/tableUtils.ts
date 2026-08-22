/** Span attributes, flattened. Every field access must tolerate undefined. */
export type TraceListRow = Record<string, unknown>;

/** Renders a row value as text; objects are JSON-serialised. */
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
