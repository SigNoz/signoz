/* eslint-disable sonarjs/cognitive-complexity */
import { useAddDynamicVariableToPanels } from 'hooks/dashboard/useAddDynamicVariableToPanels';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import { v4 as uuidv4 } from 'uuid';

import { convertVariablesToDbFormat } from './util';

// Note: This logic completely mimics the logic in DashboardVariableSelection.tsx
// but is separated to avoid unnecessary logic addition.
interface UseDashboardVariableUpdateReturn {
	onValueUpdate: (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		haveCustomValuesSelected?: boolean,
	) => void;
	createVariable: (
		name: string,
		value: IDashboardVariable['selectedValue'],
		// type?: IDashboardVariable['type'],
		description?: string,
		source?: 'logs' | 'traces' | 'metrics' | 'all sources',
		widgetId?: string,
	) => void;
	updateVariables: (
		updatedVariablesData: Dashboard['data']['variables'],
		currentRequestedId?: string,
		widgetIds?: string[],
		applyToAll?: boolean,
	) => void;
}

export const useDashboardVariableUpdate = (): UseDashboardVariableUpdateReturn => {
	const {
		selectedDashboard,
		setSelectedDashboard,
		updateLocalStorageDashboardVariables,
	} = useDashboard();

	const addDynamicVariableToPanels = useAddDynamicVariableToPanels();
	const updateMutation = useUpdateDashboard();

	const onValueUpdate = useCallback(
		(
			name: string,
			id: string,
			value: IDashboardVariable['selectedValue'],
			allSelected: boolean,
			haveCustomValuesSelected?: boolean,
		): void => {
			if (id) {
				// Performance optimization: For dynamic variables with allSelected=true, we don't store
				// individual values in localStorage since we can always derive them from available options.
				// This makes localStorage much lighter and more efficient.
				// currently all the variables are dynamic
				const isDynamic = true;
				updateLocalStorageDashboardVariables(name, value, allSelected, isDynamic);

				if (selectedDashboard) {
					setSelectedDashboard((prev) => {
						if (prev) {
							const oldVariables = prev?.data.variables;
							// this is added to handle case where we have two different
							// schemas for variable response
							if (oldVariables?.[id]) {
								oldVariables[id] = {
									...oldVariables[id],
									selectedValue: value,
									allSelected,
									haveCustomValuesSelected,
								};
							}
							if (oldVariables?.[name]) {
								oldVariables[name] = {
									...oldVariables[name],
									selectedValue: value,
									allSelected,
									haveCustomValuesSelected,
								};
							}
							return {
								...prev,
								data: {
									...prev?.data,
									variables: {
										...oldVariables,
									},
								},
							};
						}
						return prev;
					});
				}
			}
		},
		[
			selectedDashboard,
			setSelectedDashboard,
			updateLocalStorageDashboardVariables,
		],
	);

	const updateVariables = useCallback(
		(
			updatedVariablesData: Dashboard['data']['variables'],
			currentRequestedId?: string,
			widgetIds?: string[],
			applyToAll?: boolean,
		): void => {
			if (!selectedDashboard) {
				return;
			}

			const newDashboard =
				(currentRequestedId &&
					addDynamicVariableToPanels(
						selectedDashboard,
						updatedVariablesData[currentRequestedId || ''],
						widgetIds,
						applyToAll,
					)) ||
				selectedDashboard;

			updateMutation.mutateAsync(
				{
					id: selectedDashboard.id,

					data: {
						...newDashboard.data,
						variables: updatedVariablesData,
					},
				},
				{
					onSuccess: (updatedDashboard) => {
						if (updatedDashboard.data) {
							setSelectedDashboard(updatedDashboard.data);
							// notifications.success({
							// 	message: t('variable_updated_successfully'),
							// });
						}
					},
				},
			);
		},
		[
			selectedDashboard,
			addDynamicVariableToPanels,
			updateMutation,
			setSelectedDashboard,
		],
	);

	const createVariable = useCallback(
		(
			name: string,
			value: IDashboardVariable['selectedValue'],
			// type: IDashboardVariable['type'] = 'DYNAMIC',
			description = '',
			source: 'logs' | 'traces' | 'metrics' | 'all sources' = 'all sources',
			// widgetId?: string,
		): void => {
			if (!selectedDashboard) {
				console.warn('No dashboard selected for variable creation');
				return;
			}

			// Get current dashboard variables
			const currentVariables = selectedDashboard.data.variables || {};

			// Create tableRowData like Dashboard Settings does
			const tableRowData = [];
			const variableOrderArr = [];
			// eslint-disable-next-line no-restricted-syntax
			for (const [key, value] of Object.entries(currentVariables)) {
				const { order, id } = value;

				tableRowData.push({
					key,
					name: key,
					...currentVariables[key],
					id,
				});

				if (order) {
					variableOrderArr.push(order);
				}
			}

			// Sort by order
			tableRowData.sort((a, b) => a.order - b.order);
			variableOrderArr.sort((a, b) => a - b);

			// Create new variable
			const nextOrder =
				variableOrderArr.length > 0 ? Math.max(...variableOrderArr) + 1 : 0;
			const newVariable: any = {
				id: uuidv4(),
				name,
				type: 'DYNAMIC' as const,
				description,
				order: nextOrder,
				selectedValue: value,
				allSelected: false,
				haveCustomValuesSelected: false,
				sort: 'ASC' as const,
				multiSelect: true,
				showALLOption: true,
				dynamicVariablesAttribute: name,
				dynamicVariablesSource: source,
				dynamicVariablesWidgetIds: [],
				queryValue: '',
			};

			// Add to tableRowData
			tableRowData.push({
				key: newVariable.id,
				...newVariable,
				id: newVariable.id,
			});

			// Convert to dashboard format and update
			const updatedVariables = convertVariablesToDbFormat(tableRowData);
			updateVariables(updatedVariables, newVariable.id, [], false);
		},
		[selectedDashboard, updateVariables],
	);

	return {
		onValueUpdate,
		createVariable,
		updateVariables,
	};
};

export default useDashboardVariableUpdate;
