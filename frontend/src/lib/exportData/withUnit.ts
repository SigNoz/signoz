// Display-format ids, not physical units — meaningful on a chart axis
// (compact-number formatting) but misleading in an export header.
const DISPLAY_ONLY_UNITS = new Set(['short', 'none']);

/** Appends a unit to a header: `value` → `value (ms)`. Skips display-only ids. */
export function withUnit(header: string, unit?: string): string {
	if (!unit || DISPLAY_ONLY_UNITS.has(unit)) {
		return header;
	}
	return `${header} (${unit})`;
}
