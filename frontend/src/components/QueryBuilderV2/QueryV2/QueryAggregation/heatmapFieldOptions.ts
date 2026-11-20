import { TelemetrytypesFieldContextDTO as FieldContext } from 'api/generated/services/sigNoz.schemas';

// Structural: the keys hook types its contexts by hand and misses `body`, which
// the generated enum carries.
interface FieldKey {
	name: string;
	fieldContext?: string;
}

// Span and log columns are read by their bare name; anything else keeps its
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
	group === 'column'
		? 'Columns'
		: `${group.charAt(0).toUpperCase()}${group.slice(1)}`;

/** The key text the querier parses back into this key (`GetFieldKeyFromKeyText`). */
export function toHeatmapFieldText(key: FieldKey): string {
	return COLUMN_CONTEXTS.has(key.fieldContext)
		? key.name
		: `${key.fieldContext}.${key.name}`;
}

interface FieldOption {
	label: string;
	value: string;
}

export type HeatmapFieldOption =
	| FieldOption
	| { label: string; options: FieldOption[] };

/**
 * Numeric keys grouped by context, each one once. `trace.*` keys are per-trace
 * aggregates, which a heatmap cannot bucket. A saved field the keys do not carry
 * leads as its own option, so the select can still show it.
 */
export function toHeatmapFieldOptions(
	keys: FieldKey[],
	selectedField: string,
): HeatmapFieldOption[] {
	const byGroup = new Map<string, Set<string>>();
	keys
		.filter((key) => key.fieldContext !== FieldContext.trace)
		.forEach((key) => {
			const group = COLUMN_CONTEXTS.has(key.fieldContext)
				? 'column'
				: String(key.fieldContext);
			byGroup.set(
				group,
				(byGroup.get(group) ?? new Set()).add(toHeatmapFieldText(key)),
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
		.map(([group, texts]) => ({
			label: headingOf(group),
			options: [...texts].map((text) => ({ label: text, value: text })),
		}));

	return selectedField && !isSelectedListed
		? [{ label: selectedField, value: selectedField }, ...groups]
		: groups;
}
