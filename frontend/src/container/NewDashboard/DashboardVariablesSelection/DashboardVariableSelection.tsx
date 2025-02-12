import { Row } from 'antd';
import { isEmpty } from 'lodash-es';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	buildDependencies,
	buildDependencyGraph,
	buildParentDependencyGraph,
	IDependencyData,
	onUpdateVariableNode,
} from './util';
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

	const [dependencyData, setDependencyData] = useState<IDependencyData | null>(
		null,
	);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

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

	useEffect(() => {
		if (variablesTableData.length > 0) {
			const depGrp = buildDependencies(variablesTableData);
			const { order, graph } = buildDependencyGraph(depGrp);
			const parentDependencyGraph = buildParentDependencyGraph(graph);

			// cleanup order to only include variables that are of type 'QUERY'
			const cleanedOrder = order.filter((variable) => {
				const variableData = variablesTableData.find(
					(v: IDashboardVariable) => v.name === variable,
				);
				return variableData?.type === 'QUERY';
			});

			setDependencyData({
				order: cleanedOrder,
				graph,
				parentDependencyGraph,
			});
		}
	}, [setVariablesToGetUpdated, variables, variablesTableData]);

	// this handles the case where the dependency order changes i.e. variable list updated via creation or deletion etc. and we need to refetch the variables
	// also trigger when the global time changes
	useEffect(
		() => {
			if (!isEmpty(dependencyData?.order)) {
				setVariablesToGetUpdated(dependencyData?.order || []);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[JSON.stringify(dependencyData?.order), minTime, maxTime],
	);

	const onValueUpdate = (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		// isMountedCall?: boolean,
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

			if (dependencyData) {
				const updatedVariables: string[] = [];
				onUpdateVariableNode(
					name,
					dependencyData.graph,
					dependencyData.order,
					(node) => updatedVariables.push(node),
				);
				setVariablesToGetUpdated((prev) => [
					...new Set([...prev, ...updatedVariables.filter((v) => v !== name)]),
				]);
			} else {
				setVariablesToGetUpdated((prev) => prev.filter((v) => v !== name));
			}
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
						dependencyData={dependencyData}
					/>
				))}
		</Row>
	);
}

export default memo(DashboardVariableSelection);
