import { IDashboardVariable } from 'types/api/dashboard/getAll';

// Type representing a single URL variable value (from LocalStoreDashboardVariables)
type UrlVariableValue =
	| IDashboardVariable['selectedValue'][]
	| IDashboardVariable['selectedValue'];

/**
 * Normalizes URL values to match the variable's multiSelect configuration
 *
 * Rules:
 * - If variable is single-select and URL value is array: take first element
 * - If variable is multi-select and URL value is string/number: convert to array
 * - If variable is multi-select and URL value is array: keep as array
 * - If variable is single-select and URL value is string/number: keep as is
 *
 * @param urlValue The raw value from URL
 * @param variable The variable configuration
 * @returns Normalized value that matches the variable's multiSelect setting
 */
export const normalizeUrlValueForVariable = (
	urlValue: UrlVariableValue,
	variable: IDashboardVariable,
): IDashboardVariable['selectedValue'] => {
	if (urlValue === undefined || urlValue === null) {
		return urlValue;
	}

	const isMultiSelect = variable.multiSelect;
	const isUrlValueArray = Array.isArray(urlValue);

	if (isMultiSelect) {
		// Variable expects array, ensure we return array
		if (isUrlValueArray) {
			return urlValue as IDashboardVariable['selectedValue'];
		}
		return [urlValue] as IDashboardVariable['selectedValue']; // Convert single value to array
	}
	// Variable expects single value
	if (isUrlValueArray) {
		// URL has array but variable is single-select, take first element
		const arrayValue = urlValue;
		return arrayValue.length > 0 ? arrayValue[0] : null;
	}
	return urlValue as IDashboardVariable['selectedValue']; // Already single value, keep as is
};
