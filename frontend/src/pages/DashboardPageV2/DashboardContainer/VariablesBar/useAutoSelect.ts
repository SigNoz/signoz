import { useEffect } from 'react';

import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import type { VariableSelection } from './selectionTypes';

/**
 * When fetched options arrive and the current selection isn't one of them,
 * auto-pick the variable's default (if present in the options) or the first
 * option — so dependent children always have a usable parent value.
 */
export function useAutoSelect(
	variable: VariableFormModel,
	options: string[],
	selection: VariableSelection,
	onAutoSelect: (selection: VariableSelection) => void,
): void {
	useEffect(() => {
		if (options.length === 0 || selection.allSelected) {
			return;
		}
		const current = selection.value;
		const isValid = Array.isArray(current)
			? current.length > 0 && current.every((c) => options.includes(String(c)))
			: current !== '' &&
				current !== null &&
				current !== undefined &&
				options.includes(String(current));
		if (isValid) {
			return;
		}
		const dv = variable.defaultValue;
		const fallback = Array.isArray(dv) ? dv[0] : dv;
		const initial =
			fallback && options.includes(fallback) ? fallback : options[0];
		onAutoSelect({
			value: variable.multiSelect ? [initial] : initial,
			allSelected: false,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options]);
}
