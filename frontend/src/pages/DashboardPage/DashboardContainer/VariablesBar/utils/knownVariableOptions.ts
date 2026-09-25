import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';

import { sortValuesByOrder } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';

/**
 * The options of a variable whose list needs no request — a CUSTOM variable's comma
 * list. Empty for QUERY and DYNAMIC, whose options only exist once fetched, and for
 * TEXT, which has none.
 *
 * Knowing them up front lets the seed resolve such a variable's value completely
 * (materializing ALL, dropping values the list no longer offers) instead of leaving
 * that to the post-fetch reconcile, which would cost a second store write and a
 * refetch of everything downstream.
 */
export function knownVariableOptions(model: VariableFormModel): string[] {
	if (model.type !== 'CUSTOM') {
		return [];
	}
	return sortValuesByOrder(commaValuesParser(model.customValue), model.sort).map(
		String,
	);
}
