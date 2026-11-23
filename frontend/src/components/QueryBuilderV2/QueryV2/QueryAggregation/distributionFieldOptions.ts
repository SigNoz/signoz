import type {
	ComboboxItemType,
	ComboboxOptionItemType,
} from '@signozhq/ui/combobox';
import { TelemetrytypesFieldContextDTO as FieldContext } from 'api/generated/services/sigNoz.schemas';
import { upperFirst } from 'lodash-es';
import type { TelemetryFieldKey } from 'types/api/v5/queryRange';

// Span and log columns are read by their name alone; anything else keeps its
// context so `attribute.quantity` and `resource.quantity` stay apart.
const COLUMN_CONTEXTS = new Set<string | undefined>([
	FieldContext.span,
	FieldContext.log,
	FieldContext[''],
]);

const GROUP_ORDER: string[] = [
	'column',
	FieldContext.attribute,
	FieldContext.resource,
];

const headingOf = (group: string): string =>
	group === 'column' ? 'Columns' : upperFirst(group);

const toItem = (text: string): ComboboxOptionItemType => ({
	type: 'item',
	label: text,
	value: text,
});

/** The key text the querier parses back into this key (`GetFieldKeyFromKeyText`). */
export function toDistributionFieldText(key: TelemetryFieldKey): string {
	return COLUMN_CONTEXTS.has(key.fieldContext)
		? key.name
		: `${key.fieldContext}.${key.name}`;
}

/**
 * Numeric keys grouped by context, each one once. `trace.*` keys are per-trace
 * aggregates, which a heatmap or distribution cannot bucket. A saved field the keys do not carry
 * leads as its own item, so the combobox can still show it.
 */
export function toDistributionFieldOptions(
	keys: TelemetryFieldKey[],
	selectedField: string,
): ComboboxItemType[] {
	const byGroup = new Map<string, Set<string>>();
	keys
		.filter((key) => key.fieldContext !== FieldContext.trace)
		.forEach((key) => {
			const group = COLUMN_CONTEXTS.has(key.fieldContext)
				? 'column'
				: String(key.fieldContext);
			byGroup.set(
				group,
				(byGroup.get(group) ?? new Set()).add(toDistributionFieldText(key)),
			);
		});

	const isSelectedListed = [...byGroup.values()].some((texts) =>
		texts.has(selectedField),
	);
	const rank = (group: string): number => {
		const index = GROUP_ORDER.indexOf(group);
		return index === -1 ? GROUP_ORDER.length : index;
	};

	const groups = [...byGroup.entries()]
		.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
		.map(([group, texts]): ComboboxItemType => ({
			type: 'group',
			label: headingOf(group),
			value: group,
			items: [...texts].map(toItem),
		}));

	return selectedField && !isSelectedListed
		? [toItem(selectedField), ...groups]
		: groups;
}
