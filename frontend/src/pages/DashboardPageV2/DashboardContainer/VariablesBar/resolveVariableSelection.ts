import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import type {
	SelectedVariableValue,
	VariableSelection,
} from './selectionTypes';
import { ALL_SELECTED } from './variablesUrlState';

/**
 * Single source of truth for "what value does this variable hold?", shared by the
 * three surfaces that used to each own a divergent copy of the rule:
 * - {@link resolveDefaultSelection} — the seed-time default (no options yet).
 * - {@link reconcileWithOptions} — the post-fetch reconcile (options known).
 * - {@link configuredDefaultValue} — the payload fallback when nothing is picked.
 *
 * Keeping them here means the variable bar, the fetch gate and the panel-query
 * payload can never disagree about a variable's default (the previous split
 * produced "bar shows ALL while the query omits the variable").
 */

/** An "every option selected" (ALL) selection. */
const ALL_SELECTION: VariableSelection = { value: null, allSelected: true };

/** The `defaultValue` reduced to a single string, or undefined when unset. */
function firstConfiguredDefault(model: VariableFormModel): string | undefined {
	const def = model.defaultValue;
	if (Array.isArray(def)) {
		return def.length > 0 ? String(def[0]) : undefined;
	}
	if (typeof def === 'string' && def !== '') {
		return def;
	}
	return undefined;
}

/** Whether the configured default marks the ALL sentinel. */
function isAllDefault(def: VariableFormModel['defaultValue']): boolean {
	return (
		def === ALL_SELECTED ||
		(Array.isArray(def) && def.length === 1 && def[0] === ALL_SELECTED)
	);
}

function isValidSingle(
	value: SelectedVariableValue,
	options: string[],
): boolean {
	return (
		!Array.isArray(value) &&
		value !== '' &&
		value !== null &&
		value !== undefined &&
		options.includes(String(value))
	);
}

/** The configured default (or first option) as a fresh selection. */
function fillDefault(
	model: VariableFormModel,
	options: string[],
): VariableSelection {
	const fallback = firstConfiguredDefault(model);
	const initial = fallback && options.includes(fallback) ? fallback : options[0];
	return {
		value: model.multiSelect ? [initial] : initial,
		allSelected: false,
	};
}

/**
 * For an ALL selection, the value to materialize (or null when unchanged).
 * Dynamic ALL travels as the `__all__` wire sentinel and renders ALL from the
 * flag, so it needs no materialized value. Query/custom ALL must carry the full
 * option array (the payload builder cannot expand it) — keep it in sync.
 */
function materializeAll(
	model: VariableFormModel,
	options: string[],
	current: SelectedVariableValue,
): VariableSelection | null {
	if (!model.multiSelect || model.type === 'DYNAMIC') {
		return null;
	}
	const alreadyFull =
		Array.isArray(current) &&
		current.length === options.length &&
		current.every((c) => options.includes(String(c)));
	return alreadyFull ? null : { value: options, allSelected: true };
}

/**
 * The seed-time default for a variable, before any options are fetched.
 * - TEXT: the configured default (`defaultValue` → `textValue`), else empty.
 * - CUSTOM/QUERY/DYNAMIC: the configured default; else ALL when allowAll is on;
 *   else a placeholder that {@link reconcileWithOptions} fills with the first
 *   option once the options resolve.
 */
export function resolveDefaultSelection(
	model: VariableFormModel,
): VariableSelection {
	if (model.type === 'TEXT') {
		return {
			value: firstConfiguredDefault(model) ?? model.textValue ?? '',
			allSelected: false,
		};
	}

	const def = model.defaultValue;
	if (isAllDefault(def)) {
		return ALL_SELECTION;
	}
	if (Array.isArray(def) && def.length > 0) {
		return { value: def, allSelected: false };
	}
	if (typeof def === 'string' && def !== '') {
		return { value: model.multiSelect ? [def] : def, allSelected: false };
	}
	if (model.multiSelect && model.showAllOption) {
		return ALL_SELECTION;
	}
	return { value: model.multiSelect ? [] : '', allSelected: false };
}

/**
 * Reconciles a variable's current selection against its freshly-fetched options.
 * Returns the next selection, or null when nothing should change (a valid pick is
 * left untouched — local-first). Behaviour, in order:
 * - materialize ALL to the full option set (query/custom);
 * - keep a still-valid multi-select subset, dropping only invalid entries;
 * - otherwise auto-pick the default (or first option) so dependent variables and
 *   panels always resolve against a usable value.
 */
export function reconcileWithOptions(
	model: VariableFormModel,
	current: VariableSelection,
	options: string[],
): VariableSelection | null {
	if (options.length === 0) {
		return null;
	}

	if (current.allSelected) {
		return materializeAll(model, options, current.value);
	}

	if (
		model.multiSelect &&
		Array.isArray(current.value) &&
		current.value.length > 0
	) {
		const valid = current.value.map(String).filter((c) => options.includes(c));
		if (valid.length === current.value.length) {
			return null;
		}
		return valid.length > 0
			? { value: valid, allSelected: false }
			: fillDefault(model, options);
	}

	if (!model.multiSelect && isValidSingle(current.value, options)) {
		return null;
	}
	return fillDefault(model, options);
}

/**
 * The value to send for a variable when the user has made no selection yet
 * (the payload fallback). Mirrors the configured default only — an ALL-by-default
 * list variable resolves to `undefined` here (its concrete values are carried by
 * the materialized selection once options are known), so it is omitted until then
 * rather than sent wrong.
 */
export function configuredDefaultValue(
	model: VariableFormModel,
): SelectedVariableValue | undefined {
	if (model.type === 'TEXT') {
		return firstConfiguredDefault(model) ?? model.textValue ?? undefined;
	}
	const def = model.defaultValue;
	if (Array.isArray(def)) {
		return def.length > 0 ? def : undefined;
	}
	return def || undefined;
}
