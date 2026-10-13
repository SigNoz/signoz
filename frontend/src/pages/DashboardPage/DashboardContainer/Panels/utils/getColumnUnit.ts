/**
 * Resolves a Table column's display unit by its key (`queryName`, or
 * `queryName.expression` for multi-aggregation queries), falling back to the base
 * query name for the legacy `queryName.expression` syntax — mirrors V1
 * `getColumnUnit`. An empty entry means "no unit" (and does not inherit the base).
 * Shared by the renderer's column builder and the editor's column options so both
 * resolve a column's unit identically.
 */
export function getColumnUnit(
	key: string,
	columnUnits: Record<string, string>,
): string | undefined {
	if (columnUnits[key] !== undefined) {
		return columnUnits[key] || undefined;
	}
	if (key.includes('.')) {
		const baseQuery = key.split('.')[0];
		if (columnUnits[baseQuery] !== undefined) {
			return columnUnits[baseQuery] || undefined;
		}
	}
	return undefined;
}
