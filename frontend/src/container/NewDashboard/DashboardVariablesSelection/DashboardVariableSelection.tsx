import { Row } from 'antd';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useRef, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import {
	buildDependencies,
	buildDependencyGraph,
	onUpdateVariableNode,
	VariableGraph,
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

	const [dependencyData, setDependencyData] = useState<{
		order: string[];
		graph: VariableGraph;
	} | null>(null);

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

	const initializationRef = useRef(false);

	useEffect(() => {
		if (variablesTableData.length > 0 && !initializationRef.current) {
			const depGrp = buildDependencies(variablesTableData);
			const { order, graph } = buildDependencyGraph(depGrp);
			setDependencyData({
				order,
				graph,
			});
			initializationRef.current = true;
		}
	}, [variablesTableData]);

	const onValueUpdate = (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		isMountedCall?: boolean,
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

			if (dependencyData && !isMountedCall) {
				const updatedVariables: string[] = [];
				onUpdateVariableNode(
					name,
					dependencyData.graph,
					dependencyData.order,
					(node) => updatedVariables.push(node),
				);
				setVariablesToGetUpdated(updatedVariables.filter((v) => v !== name)); // question?
			} else if (isMountedCall) {
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
