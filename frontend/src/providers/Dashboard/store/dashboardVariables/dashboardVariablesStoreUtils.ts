import {
	buildDependencies,
	buildDependencyGraph,
} from 'container/DashboardContainer/DashboardVariablesSelection/util';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import {
	IDashboardVariables,
	IDashboardVariablesStoreState,
	IDependencyData,
} from './dashboardVariablesStoreTypes';

/**
 * Build a sorted array of variables by their order property
 */
export function buildSortedVariablesArray(
	variables: IDashboardVariables,
): IDashboardVariable[] {
	const sortedVariablesArray: IDashboardVariable[] = [];

	Object.values(variables).forEach((value) => {
		sortedVariablesArray.push({ ...value });
	});

	sortedVariablesArray.sort((a, b) => a.order - b.order);

	return sortedVariablesArray;
}

/**
 * Build dependency data from sorted variables array
 * This includes the dependency graph, topological order, and cycle detection
 */
export function buildDependencyData(
	sortedVariablesArray: IDashboardVariable[],
): IDependencyData | null {
	if (sortedVariablesArray.length === 0) {
		return null;
	}

	const dependencies = buildDependencies(sortedVariablesArray);
	const {
		order,
		graph,
		parentDependencyGraph,
		hasCycle,
		cycleNodes,
	} = buildDependencyGraph(dependencies);

	// Filter order to only include QUERY type variables
	const queryVariableOrder = order.filter((variable: string) => {
		const variableData = sortedVariablesArray.find((v) => v.name === variable);
		return variableData?.type === 'QUERY';
	});

	return {
		order: queryVariableOrder,
		graph,
		parentDependencyGraph,
		hasCycle,
		cycleNodes,
	};
}

/**
 * Compute derived values from variables
 * This is a composition of buildSortedVariablesArray and buildDependencyData
 */
export function computeDerivedValues(
	variables: IDashboardVariablesStoreState['variables'],
): Pick<
	IDashboardVariablesStoreState,
	'sortedVariablesArray' | 'dependencyData'
> {
	const sortedVariablesArray = buildSortedVariablesArray(variables);
	const dependencyData = buildDependencyData(sortedVariablesArray);

	return { sortedVariablesArray, dependencyData };
}

/**
 * Update derived values in the store state (for use with immer)
 */
export function updateDerivedValues(
	draft: IDashboardVariablesStoreState,
): void {
	draft.sortedVariablesArray = buildSortedVariablesArray(draft.variables);
	draft.dependencyData = buildDependencyData(draft.sortedVariablesArray);
}
