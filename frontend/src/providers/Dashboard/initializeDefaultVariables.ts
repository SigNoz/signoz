import { ALL_SELECTED_VALUE } from 'components/NewSelect/utils';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { commaValuesParser } from '../../lib/dashbaordVariables/customCommaValuesParser';

interface UrlVariables {
	[key: string]: any;
}

/**
 * Initializes default values for dashboard variables if not already in URL
 * Handles cases where variables might be keyed by either id or name
 *
 * @param variables Dashboard variables object
 * @param getUrlVariables Function to get variables from URL
 * @param updateUrlVariable Function to update URL with variable values
 */
export const initializeDefaultVariables = (
	variables: Record<string, IDashboardVariable>,
	getUrlVariables: () => UrlVariables | undefined,
	updateUrlVariable: (
		name: string,
		selectedValue: IDashboardVariable['selectedValue'],
	) => void,
): void => {
	if (!variables) return;

	Object.values(variables).forEach((variable) => {
		const { id, name, allSelected, showALLOption } = variable;
		const urlVariables = getUrlVariables();

		// Check if either id or name is available in URL variables
		const existsInUrl =
			(id && urlVariables?.[id]) || (name && urlVariables?.[name]);

		const value =
			variable.type === 'CUSTOM'
				? commaValuesParser(variable?.customValue || '')
				: variable?.selectedValue ?? variable?.defaultValue;

		if (!existsInUrl) {
			updateUrlVariable(
				name || id,
				allSelected && showALLOption ? ALL_SELECTED_VALUE : value,
			);
		}
	});
};
