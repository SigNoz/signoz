import { useEffect, useMemo } from 'react';
import logEvent from 'api/common/logEvent';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import {
	sortValuesByOrder,
	VARIABLE_TYPE_EVENT_LABEL,
} from '../../DashboardSettings/Variables/variableFormModel';
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

	// One-shot per distinct fetch error (effect only re-runs when it changes).
	useEffect(() => {
		if (fetched.errorMessage) {
			void logEvent(DashboardDetailEvents.VariableOptionsFetchFailed, {
				variableType: VARIABLE_TYPE_EVENT_LABEL[variable.type],
			});
		}
	}, [fetched.errorMessage, variable.type]);

	if (variable.type === 'CUSTOM') {
		return { options: customOptions, loading: false, errorMessage: null };
	}
	return fetched;
}
