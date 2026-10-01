import type { ConfigChipItem } from '../../controls/ConfigChips/ConfigChips';
import type { ConfigSelectItem } from '../../controls/ConfigSelect/ConfigSelect';

/** The select value for an unset dimension; the spec stores it as `''`. */
export const UNSET_DIMENSION = '';

/**
 * The unset option first, then the result's columns. A bound key the current
 * result no longer has stays listed, so the select never shows a bare value.
 */
export function buildDimensionItems(
	columns: ConfigSelectItem[],
	current: string | undefined,
	unsetLabel: string,
): ConfigSelectItem[] {
	const items = [{ value: UNSET_DIMENSION, label: unsetLabel }, ...columns];
	if (current && !columns.some((column) => column.value === current)) {
		items.push({ value: current, label: `${current} (not in results)` });
	}
	return items;
}

/** The result's group-by keys, then any selected key the result no longer has. */
export function buildColorKeyItems(
	groupColumns: string[],
	selected: string[],
): ConfigChipItem[] {
	return [
		...groupColumns.map((column) => ({ value: column, label: column })),
		...selected
			.filter((key) => !groupColumns.includes(key))
			.map((key) => ({ value: key, label: `${key} (not in results)` })),
	];
}

export function getColorByHelp(
	selected: string[],
	groupColumns: string[],
): string {
	if (groupColumns.length === 0 && selected.length === 0) {
		return 'Group the query by a label to colour dots by it.';
	}
	return selected.length > 0
		? 'One colour per value of the selected keys.'
		: 'None selected: colour by every group key.';
}
