/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable import/no-extraneous-dependencies */

import { Row } from 'antd';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import { convertVariablesToDbFormat } from './util';
import VariableItem from './VariableItem';

function DashboardVariableSelection(): JSX.Element | null {
	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const { data } = selectedDashboard || {};

	const { variables } = data || {};

	const [update, setUpdate] = useState<boolean>(false);
	const [lastUpdatedVar, setLastUpdatedVar] = useState<string>('');

	const [variablesTableData, setVariablesTableData] = useState<any>([]);

	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	useEffect(() => {
		if (variables) {
			const tableRowData = [];
			// eslint-disable-next-line sonarjs/no-unused-collection
			const variableOrderArr = [];

			for (const [key, value] of Object.entries(variables)) {
				const { order, id } = value;

				tableRowData.push({
					key,
					name: key,
					...variables[key],
					id,
				});

				if (order) {
					variableOrderArr.push(order);
				}
			}

			tableRowData.sort((a, b) => a.order - b.order);
			variableOrderArr.sort((a, b) => a - b);

			setVariablesTableData(tableRowData);
		}
	}, [variables]);

	const onVarChanged = (name: string): void => {
		setLastUpdatedVar(name);
		setUpdate(!update);
	};

	const updateMutation = useUpdateDashboard();
	const { notifications } = useNotifications();

	// console.log('arrayOfKeyValuePairs', variablesKeys);

	const updateVariables = (
		name: string,
		updatedVariablesData: Dashboard['data']['variables'],
	): void => {
		if (!selectedDashboard) {
			return;
		}

		updateMutation.mutateAsync(
			{
				...selectedDashboard,
				data: {
					...selectedDashboard.data,
					variables: updatedVariablesData,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.payload) {
						setSelectedDashboard(updatedDashboard.payload);
					}
				},
				onError: () => {
					notifications.error({
						message: `Error updating ${name} variable`,
					});
				},
			},
		);
	};

	const onValueUpdate = (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	): void => {
		if (id) {
			const newVariablesArr = variablesTableData.map(
				(variable: IDashboardVariable) => {
					if (variable.id === id) {
						variable.selectedValue = value;
						variable.allSelected = allSelected;
					}

					return variable;
				},
			);

			const variables = convertVariablesToDbFormat(newVariablesArr);

			if (role !== 'VIEWER' && selectedDashboard) {
				updateVariables(name, variables);
			}
			onVarChanged(name);

			setUpdate(!update);
		}
	};

	if (!variables) {
		return null;
	}

	const orderBasedSortedVariables = variablesTableData.sort(
		(a: { order: number }, b: { order: number }) => a.order - b.order,
	);

	return (
		<Row>
			{orderBasedSortedVariables &&
				Array.isArray(orderBasedSortedVariables) &&
				orderBasedSortedVariables.length > 0 &&
				orderBasedSortedVariables.map((variable) => (
					<VariableItem
						key={`${variable.name}${variable.id}}${variable.order}`}
						existingVariables={variables}
						lastUpdatedVar={lastUpdatedVar}
						variableData={{
							name: variable.name,
							...variable,
							change: update,
						}}
						onValueUpdate={onValueUpdate}
					/>
				))}
		</Row>
	);
}

export default memo(DashboardVariableSelection);
