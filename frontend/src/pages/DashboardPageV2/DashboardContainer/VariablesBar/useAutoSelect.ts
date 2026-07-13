import { useEffect } from 'react';

import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import type {
	SelectedVariableValue,
	VariableSelection,
} from './selectionTypes';

/** The variable's default (or first option) as a fresh selection. */
function fillDefault(
	variable: VariableFormModel,
	options: string[],
): VariableSelection {
	const dv = variable.defaultValue;
	const fallback = Array.isArray(dv) ? dv[0] : dv;
	const initial = fallback && options.includes(fallback) ? fallback : options[0];
	return {
		value: variable.multiSelect ? [initial] : initial,
		allSelected: false,
	};
}

/** For an all-selected variable, the value to materialize (or null if unchanged). */
function reconcileAllSelected(
	variable: VariableFormModel,
	options: string[],
	current: SelectedVariableValue,
): VariableSelection | null {
	// Dynamic ALL travels as the `__all__` wire sentinel and shows ALL from the
	// flag, so it needs no materialized value. Query/custom ALL must carry the full
	// option array (the payload builder can't expand it) — keep it in sync.
	if (!variable.multiSelect || variable.type === 'DYNAMIC') {
		return null;
	}
	const alreadyFull =
		Array.isArray(current) &&
		current.length === options.length &&
		current.every((c) => options.includes(String(c)));
	return alreadyFull ? null : { value: options, allSelected: true };
}

function isValidSingle(
	current: SelectedVariableValue,
	options: string[],
): boolean {
	return (
		!Array.isArray(current) &&
		current !== '' &&
		current !== null &&
		current !== undefined &&
		options.includes(String(current))
	);
}

/**
 * Reconciles a variable's selection with its freshly-fetched options: materialize
 * ALL to the full set, keep a still-valid multi-select subset, else auto-pick the
 * default (or first option) so dependent children always have a usable value.
 */
export function useAutoSelect(
	variable: VariableFormModel,
	options: string[],
	selection: VariableSelection,
	onAutoSelect: (selection: VariableSelection) => void,
): void {
	useEffect(() => {
		if (options.length === 0) {
			return;
		}
		const current = selection.value;

		if (selection.allSelected) {
			const next = reconcileAllSelected(variable, options, current);
			if (next) {
				onAutoSelect(next);
			}
			return;
		}

		if (variable.multiSelect && Array.isArray(current) && current.length > 0) {
			const valid = current.map(String).filter((c) => options.includes(c));
			if (valid.length === current.length) {
				return;
			}
			onAutoSelect(
				valid.length > 0
					? { value: valid, allSelected: false }
					: fillDefault(variable, options),
			);
			return;
		}

		if (!variable.multiSelect && isValidSingle(current, options)) {
			return;
		}
		onAutoSelect(fillDefault(variable, options));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options]);
}
