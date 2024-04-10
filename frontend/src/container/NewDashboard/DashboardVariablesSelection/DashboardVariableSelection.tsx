import { Row } from 'antd';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

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
			updateLocalStorageDashboardVariables(name, value, allSelected);

			if (selectedDashboard) {
				setSelectedDashboard((prev) => {
					if (prev) {
						return {
							...prev,
							data: {
								...prev?.data,
								variables: {
									...prev?.data.variables,
									[id]: {
										...prev.data.variables[id],
										selectedValue: value,
										allSelected,
									},
								},
							},
						};
					}
					return prev;
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
