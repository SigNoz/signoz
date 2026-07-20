import { useEffect } from 'react';

import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import { reconcileWithOptions } from '../utils/resolveVariableSelection';
import type { VariableSelection } from '../selectionTypes';

/**
 * Reconciles a variable's selection with its freshly-fetched options and fires
 * `onAutoSelect` only when the value must change. The reconcile rule lives in
 * {@link reconcileWithOptions} (shared with seed + payload defaulting) so the bar
 * and the panel query can never disagree about a variable's default.
 */
export function useAutoSelect(
	variable: VariableFormModel,
	options: string[],
	selection: VariableSelection,
	onAutoSelect: (selection: VariableSelection) => void,
): void {
	useEffect(() => {
		const next = reconcileWithOptions(variable, selection, options);
		if (next) {
			onAutoSelect(next);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options]);
}
