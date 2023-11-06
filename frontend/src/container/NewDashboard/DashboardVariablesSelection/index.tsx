import { Row } from 'antd';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { map, sortBy } from 'lodash-es';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
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
						notifications.success({
							message: 'Variable updated successfully',
						});
					}
				},
				onError: () => {
					notifications.error({
						message: 'Error while updating variable',
					});
				},
			},
		);
	};

	const onValueUpdate = (
		name: string,
		value: IDashboardVariable['selectedValue'],
	): void => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].selectedValue = value;

		if (role !== 'VIEWER' && selectedDashboard) {
			updateVariables(updatedVariablesData);
		}

		onVarChanged(name);
	};
	const onAllSelectedUpdate = (
		name: string,
		value: IDashboardVariable['allSelected'],
	): void => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].allSelected = value;

		if (role !== 'VIEWER') {
			updateVariables(updatedVariablesData);
		}
		onVarChanged(name);
	};

	if (!variables) {
		return null;
	}

	return (
		<Row>
			{map(sortBy(Object.keys(variables)), (variableName) => (
				<VariableItem
					key={`${variableName}${variables[variableName].modificationUUID}`}
					existingVariables={variables}
					variableData={{
						name: variableName,
						...variables[variableName],
						change: update,
					}}
					onValueUpdate={onValueUpdate}
					onAllSelectedUpdate={onAllSelectedUpdate}
					lastUpdatedVar={lastUpdatedVar}
				/>
			))}
		</Row>
	);
}

export default DashboardVariableSelection;
