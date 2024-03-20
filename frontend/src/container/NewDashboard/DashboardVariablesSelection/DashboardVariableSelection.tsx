import { Row } from 'antd';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { convertVariablesToDbFormat } from './util';
import VariableItem from './VariableItem';

function DashboardVariableSelection(): JSX.Element | null {
	const {
		selectedDashboard,
		setSelectedDashboard,
		updateLocalStorageDashboardVariables,
	} = useDashboard();

	const { data } = selectedDashboard || {};

	const { variables } = data || {};

	const [update, setUpdate] = useState<boolean>(false);
	const [lastUpdatedVar, setLastUpdatedVar] = useState<string>('');

	const [variablesTableData, setVariablesTableData] = useState<any>([]);

	useEffect(() => {
		if (variables) {
			const tableRowData = [];

			// eslint-disable-next-line no-restricted-syntax
			for (const [key, value] of Object.entries(variables)) {
				const { id } = value;

				tableRowData.push({
					key,
					name: key,
					...variables[key],
					id,
				});
			}

			tableRowData.sort((a, b) => a.order - b.order);

			setVariablesTableData(tableRowData);
		}
	}, [variables]);

	const onVarChanged = (name: string): void => {
		setLastUpdatedVar(name);
		setUpdate(!update);
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
					const variableCopy = { ...variable };

					if (variableCopy.id === id) {
						variableCopy.selectedValue = value;
						variableCopy.allSelected = allSelected;
					}

					return variableCopy;
				},
			);
			updateLocalStorageDashboardVariables(name, value, allSelected);

			const variables = convertVariablesToDbFormat(newVariablesArr);

			if (selectedDashboard) {
				setSelectedDashboard({
					...selectedDashboard,
					data: {
						...selectedDashboard?.data,
						variables: {
							...variables,
						},
					},
				});
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
