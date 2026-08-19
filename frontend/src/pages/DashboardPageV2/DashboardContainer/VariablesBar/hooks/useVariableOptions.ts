import { useEffect, useMemo } from 'react';
import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import { VARIABLE_TYPE_EVENT_LABEL } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from '../selectionTypes';
import { knownVariableOptions } from '../utils/knownVariableOptions';
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

	// Keyed on the fields the parse actually reads, not the model identity: a dashboard
	// refetch hands back an equal-but-new model, and a new options array would re-fire
	// the post-fetch reconcile for nothing.
	const customOptions = useMemo(
		() => knownVariableOptions(variable),
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
