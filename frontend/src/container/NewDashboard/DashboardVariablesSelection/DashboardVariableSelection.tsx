import { Row } from 'antd';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { map, sortBy } from 'lodash-es';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import VariableItem from './VariableItem';

function DashboardVariableSelection(): JSX.Element | null {
	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const { data } = selectedDashboard || {};

	const { variables } = data || {};

	const [update, setUpdate] = useState<boolean>(false);
	const [lastUpdatedVar, setLastUpdatedVar] = useState<string>('');

	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const onVarChanged = (name: string): void => {
		setLastUpdatedVar(name);
		setUpdate(!update);
	};

	const updateMutation = useUpdateDashboard();
	const { notifications } = useNotifications();

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
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	): void => {
		const updatedVariablesData = { ...variables };

		console.log('updatedVariablesData', updatedVariablesData, value, allSelected);

		// updatedVariablesData[name]?.selectedValue = value;
		// updatedVariablesData[name]?.allSelected = allSelected;

		return false;

		if (role !== 'VIEWER' && selectedDashboard) {
			updateVariables(name, updatedVariablesData);
		}
		onVarChanged(name);

		setUpdate(!update);
	};

	if (!variables) {
		return null;
	}

	const varriablesKeyValuePairs = Object.entries(variables);
	varriablesKeyValuePairs.sort(([, a], [, b]) => a.order - b.order);

	const orderBasedSortedVariables = Object.fromEntries(varriablesKeyValuePairs);

	const variablesKeys = Object.keys(orderBasedSortedVariables);

	// console.log('arrayOfKeyValuePairs', variablesKeys);

	return (
		<Row>
			{variablesKeys &&
				map(variablesKeys, (variableName) => (
					<VariableItem
						key={`${variableName}${variables[variableName].id}}${variables[variableName].order}`}
						existingVariables={variables}
						lastUpdatedVar={lastUpdatedVar}
						variableData={{
							name: variableName,
							...variables[variableName],
							change: update,
						}}
						onValueUpdate={onValueUpdate}
					/>
				))}
		</Row>
	);
}

export default memo(DashboardVariableSelection);
