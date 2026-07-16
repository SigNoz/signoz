import { useMemo } from 'react';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';

import { sortValuesByOrder } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from '../selectionTypes';
import {
	useFetchedVariableOptions,
	type VariableOptions,
} from './useFetchedVariableOptions';

export type { VariableOptions };

/**
 * The option list for a list variable (QUERY / CUSTOM / DYNAMIC), plus its loading
 * and error state — the single place the three list types get their options.
 * QUERY/DYNAMIC options come from {@link useFetchedVariableOptions} (fetch engine).
 * CUSTOM is parsed synchronously from its comma list. TEXT never reaches here (it
 * has no options).
 */
export function useVariableOptions(
	variable: VariableFormModel,
	variables: VariableFormModel[],
	selections: VariableSelectionMap,
): VariableOptions {
	const fetched = useFetchedVariableOptions(variable, variables, selections);

	const customOptions = useMemo(
		() =>
			variable.type === 'CUSTOM'
				? sortValuesByOrder(
						commaValuesParser(variable.customValue),
						variable.sort,
					).map(String)
				: ([] as string[]),
		[variable.type, variable.customValue, variable.sort],
	);

	if (variable.type === 'CUSTOM') {
		return { options: customOptions, loading: false, errorMessage: null };
	}
	return fetched;
}
