import { Row } from 'antd';
import { isNull } from 'lodash-es';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import VariableItem from './VariableItem';

function DashboardVariableSelection(): JSX.Element | null {
	const {
		selectedDashboard,
		setSelectedDashboard,
		updateLocalStorageDashboardVariables,
		variablesToGetUpdated,
		setVariablesToGetUpdated,
	} = useDashboard();

	const { data } = selectedDashboard || {};

	const { variables } = data || {};

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
		/**
		 * this function takes care of adding the dependent variables to current update queue and removing
		 * the updated variable name from the queue
		 */
		const dependentVariables = variablesTableData
			?.map((variable: any) => {
				if (variable.type === 'QUERY') {
					const re = new RegExp(`\\{\\{\\s*?\\.${name}\\s*?\\}\\}`); // regex for `{{.var}}`
					const queryValue = variable.queryValue || '';
					const dependVarReMatch = queryValue.match(re);
					if (dependVarReMatch !== null && dependVarReMatch.length > 0) {
						return variable.name;
					}
				}
				return null;
			})
			.filter((val: string | null) => !isNull(val));
		setVariablesToGetUpdated((prev) => [
			...prev.filter((v) => v !== name),
			...dependentVariables,
		]);
	};

	const onValueUpdate = (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		// eslint-disable-next-line sonarjs/cognitive-complexity
	): void => {
		if (id) {
			updateLocalStorageDashboardVariables(name, value, allSelected);

			if (selectedDashboard) {
				setSelectedDashboard((prev) => {
					if (prev) {
						const oldVariables = prev?.data.variables;
						// this is added to handle case where we have two different
						// schemas for variable response
						if (oldVariables[id]) {
							oldVariables[id] = {
								...oldVariables[id],
								selectedValue: value,
								allSelected,
							};
						}
						if (oldVariables[name]) {
							oldVariables[name] = {
								...oldVariables[name],
								selectedValue: value,
								allSelected,
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

			onVarChanged(name);
		}
	};

	if (!variables) {
		return null;
	}

	const orderBasedSortedVariables = variablesTableData.sort(
		(a: { order: number }, b: { order: number }) => a.order - b.order,
	);

	return (
		<Row style={{ display: 'flex', gap: '12px' }}>
			{orderBasedSortedVariables &&
				Array.isArray(orderBasedSortedVariables) &&
				orderBasedSortedVariables.length > 0 &&
				orderBasedSortedVariables.map((variable) => (
					<VariableItem
						key={`${variable.name}${variable.id}}${variable.order}`}
						existingVariables={variables}
						variableData={{
							name: variable.name,
							...variable,
						}}
						onValueUpdate={onValueUpdate}
						variablesToGetUpdated={variablesToGetUpdated}
						setVariablesToGetUpdated={setVariablesToGetUpdated}
					/>
				))}
		</Row>
	);
}

export default memo(DashboardVariableSelection);
