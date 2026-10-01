import type { ConfigMultiSelectItem } from '../../controls/ConfigMultiSelect/ConfigMultiSelect';
import type { ConfigSelectItem } from '../../controls/ConfigSelect/ConfigSelect';
import type { TableColumnOption } from '../../../hooks/useTableColumns';

/** The select value for an unset dimension; the spec stores it as `''`. */
export const UNSET_DIMENSION = '';

/** `A · Request rate`, or the key alone when the name only repeats it (`A.count()`). */
export function formatColumnOption({
	key,
	name,
}: Pick<TableColumnOption, 'key' | 'name'>): string {
	return key === name || key.endsWith(`.${name}`) ? key : `${key} · ${name}`;
}

export function formatAutoOption(
	column: TableColumnOption | undefined,
): string {
	return column ? `Auto (${formatColumnOption(column)})` : 'Auto';
}

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
): ConfigMultiSelectItem[] {
	return [
		...groupColumns.map((column) => ({ value: column, label: column })),
		...selected
			.filter((key) => !groupColumns.includes(key))
			.map((key) => ({ value: key, label: `${key} (not in results)` })),
	];
}
