import { ALL_SELECTED_VALUE } from 'components/NewSelect/utils';
import { getLocalStorageDashboardVariables } from 'hooks/dashboard/useDashboardFromLocalStorage';
import useVariablesFromUrl, {
	UseVariablesFromUrlReturn,
} from 'hooks/dashboard/useVariablesFromUrl';
import { isEmpty } from 'lodash-es';
import { normalizeUrlValueForVariable } from 'providers/Dashboard/normalizeUrlValue';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import { v4 as generateUUID } from 'uuid';

export function useTransformDashboardVariables(dashboardId: string): Pick<
	UseVariablesFromUrlReturn,
	'getUrlVariables' | 'updateUrlVariable'
> & {
	transformDashboardVariables: (data: Dashboard) => Dashboard;
	currentDashboard: ReturnType<typeof getLocalStorageDashboardVariables>;
} {
	const { getUrlVariables, updateUrlVariable } = useVariablesFromUrl();

	const mergeDBWithLocalStorage = (
		data: Dashboard,
		localStorageVariables: any,
	): Dashboard => {
		const updatedData = data;
		const variables = data?.data?.variables;
		if (data && localStorageVariables && variables) {
			const updatedVariables = variables;
			const variablesFromUrl = getUrlVariables();
			Object.keys(variables).forEach((variable) => {
				const variableData = variables[variable];

				// values from url
				const urlVariable = variableData?.name
					? variablesFromUrl[variableData?.name] || variablesFromUrl[variableData.id]
					: variablesFromUrl[variableData.id];

				let updatedVariable = {
					...variables[variable],
					...localStorageVariables[variableData.name as any],
				};

				// respect the url variable if it is set, override the others
				if (!isEmpty(urlVariable)) {
					if (urlVariable === ALL_SELECTED_VALUE) {
						updatedVariable = {
							...updatedVariable,
							allSelected: true,
						};
					} else {
						// Normalize URL value to match variable's multiSelect configuration
						const normalizedValue = normalizeUrlValueForVariable(
							urlVariable,
							variableData,
						);

						updatedVariable = {
							...updatedVariable,
							selectedValue: normalizedValue,
							// Only set allSelected to false if showALLOption is available
							...(updatedVariable?.showALLOption && { allSelected: false }),
						};
					}
				}

				updatedVariables[variable] = updatedVariable;
			});
			updatedData.data.variables = updatedVariables;
		}
		return updatedData;
	};

	// As we do not have order and ID's in the variables object, we have to process variables to add order and ID if they do not exist in the variables object
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const transformDashboardVariables = (data: Dashboard): Dashboard => {
		if (data && data.data && data.data.variables) {
			const clonedDashboardData = mergeDBWithLocalStorage(
				JSON.parse(JSON.stringify(data)),
				getLocalStorageDashboardVariables(dashboardId),
			);
			const { variables } = clonedDashboardData.data;
			const existingOrders: Set<number> = new Set();

			for (const key in variables) {
				// eslint-disable-next-line no-prototype-builtins
				if (variables.hasOwnProperty(key)) {
					const variable: IDashboardVariable = variables[key];

					// Check if 'order' property doesn't exist or is undefined
					if (variable.order === undefined) {
						// Find a unique order starting from 0
						let order = 0;
						while (existingOrders.has(order)) {
							order += 1;
						}

						variable.order = order;
						existingOrders.add(order);
						// ! BWC - Specific case for backward compatibility where textboxValue was used instead of defaultValue
						if (variable.type === 'TEXTBOX' && !variable.defaultValue) {
							variable.defaultValue = variable.textboxValue || '';
						}
					}

					if (variable.id === undefined) {
						variable.id = generateUUID();
					}
				}
			}

			return clonedDashboardData;
		}

		return data;
	};

	return {
		transformDashboardVariables,
		getUrlVariables,
		updateUrlVariable,
		currentDashboard: getLocalStorageDashboardVariables(dashboardId),
	};
}
