import { OptionData } from 'components/NewSelect/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';
import { isEmpty } from 'lodash-es';
import {
	IDashboardVariables,
	IDependencyData,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import {
	onVariableFetchComplete,
	onVariableFetchFailure,
	variableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

export function areArraysEqual(
	a: (string | number | boolean)[],
	b: (string | number | boolean)[],
): boolean {
	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0; i < a.length; i += 1) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}

export const convertVariablesToDbFormat = (
	variblesArr: IDashboardVariable[],
): IDashboardVariables =>
	variblesArr.reduce((result, obj: IDashboardVariable) => {
		const { id } = obj;

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		result[id] = obj;
		return result;
	}, {});

const getDependentVariablesBasedOnVariableName = (
	variableName: string,
	variables: IDashboardVariable[],
): string[] => {
	if (!variables || !Array.isArray(variables)) {
		return [];
	}

	return variables
		.map((variable) => {
			if (variable.type === 'QUERY') {
				const queryValue = variable.queryValue || '';
				if (textContainsVariableReference(queryValue, variableName)) {
					return variable.name;
				}
			}
			return null;
		})
		.filter((val): val is string => val !== null);
};
export type VariableGraph = Record<string, string[]>;

export const buildDependencies = (
	variables: IDashboardVariable[],
): VariableGraph => {
	const graph: VariableGraph = {};

	// Initialize empty arrays for all variables first
	variables.forEach((variable) => {
		if (variable.name) {
			graph[variable.name] = [];
		}
	});

	// For each QUERY variable, add it as a dependent to its referenced variables
	variables.forEach((variable) => {
		if (variable.name) {
			const dependentVariables = getDependentVariablesBasedOnVariableName(
				variable.name,
				variables,
			);

			// For each referenced variable, add the current query as a dependent
			graph[variable.name] = dependentVariables;
		}
	});

	return graph;
};

export const buildParentDependencyGraph = (
	graph: VariableGraph,
): VariableGraph => {
	const parentGraph: VariableGraph = {};

	// Initialize empty arrays for all nodes
	Object.keys(graph).forEach((node) => {
		parentGraph[node] = [];
	});

	// For each node and its children in the original graph
	Object.entries(graph).forEach(([node, children]) => {
		// For each child, add the current node as its parent
		children.forEach((child) => {
			if (!parentGraph[child]) {
				parentGraph[child] = [];
			}
			parentGraph[child].push(node);
		});
	});

	return parentGraph;
};

const collectCyclePath = (
	graph: VariableGraph,
	start: string,
	end: string,
): string[] => {
	const path: string[] = [];
	let current = start;

	const findParent = (node: string): string | undefined =>
		Object.keys(graph).find((key) => graph[key]?.includes(node));

	while (current !== end) {
		const parent = findParent(current);
		if (!parent) {
			break;
		}
		path.push(parent);
		current = parent;
	}

	return [start, ...path];
};

const detectCycle = (
	graph: VariableGraph,
	node: string,
	visited: Set<string>,
	recStack: Set<string>,
): string[] | null => {
	if (!visited.has(node)) {
		visited.add(node);
		recStack.add(node);

		const neighbors = graph[node] || [];
		let cycleNodes: string[] | null = null;

		neighbors.some((neighbor) => {
			if (!visited.has(neighbor)) {
				const foundCycle = detectCycle(graph, neighbor, visited, recStack);
				if (foundCycle) {
					cycleNodes = foundCycle;
					return true;
				}
			} else if (recStack.has(neighbor)) {
				// Found a cycle, collect the cycle nodes
				cycleNodes = collectCyclePath(graph, node, neighbor);
				return true;
			}
			return false;
		});

		if (cycleNodes) {
			return cycleNodes;
		}
	}
	recStack.delete(node);
	return null;
};

export const buildDependencyGraph = (
	dependencies: VariableGraph,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): IDependencyData => {
	const inDegree: Record<string, number> = {};
	const adjList: VariableGraph = {};

	// Initialize in-degree and adjacency list
	Object.keys(dependencies).forEach((node) => {
		if (!inDegree[node]) {
			inDegree[node] = 0;
		}
		if (!adjList[node]) {
			adjList[node] = [];
		}
		dependencies[node]?.forEach((child) => {
			if (!inDegree[child]) {
				inDegree[child] = 0;
			}
			inDegree[child]++;
			adjList[node].push(child);
		});
	});

	// Detect cycles
	const visited = new Set<string>();
	const recStack = new Set<string>();
	let cycleNodes: string[] | undefined;

	Object.keys(dependencies).some((node) => {
		if (!visited.has(node)) {
			const foundCycle = detectCycle(dependencies, node, visited, recStack);
			if (foundCycle) {
				cycleNodes = foundCycle;
				return true;
			}
		}
		return false;
	});

	// Topological sort using Kahn's Algorithm
	const queue: string[] = Object.keys(inDegree).filter(
		(node) => inDegree[node] === 0,
	);
	const topologicalOrder: string[] = [];

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) {
			break;
		}
		topologicalOrder.push(current);

		adjList[current]?.forEach((neighbor) => {
			inDegree[neighbor]--;
			if (inDegree[neighbor] === 0) {
				queue.push(neighbor);
			}
		});
	}

	const hasCycle = topologicalOrder.length !== Object.keys(dependencies)?.length;

	// Pre-compute transitive descendants by walking topological order in reverse.
	// Each node's transitive descendants = direct children + their transitive descendants.
	const transitiveDescendants: VariableGraph = {};
	for (let i = topologicalOrder.length - 1; i >= 0; i--) {
		const node = topologicalOrder[i];
		const desc = new Set<string>();
		for (const child of adjList[node] || []) {
			desc.add(child);
			for (const d of transitiveDescendants[child] || []) {
				desc.add(d);
			}
		}
		transitiveDescendants[node] = Array.from(desc);
	}

	return {
		order: topologicalOrder,
		graph: adjList,
		parentDependencyGraph: buildParentDependencyGraph(adjList),
		transitiveDescendants,
		hasCycle,
		cycleNodes,
	};
};

export const onUpdateVariableNode = (
	nodeToUpdate: string,
	graph: VariableGraph,
	topologicalOrder: string[],
	callback: (node: string) => void,
): void => {
	const visited = new Set<string>();

	// If nodeToUpdate is not in topologicalOrder (e.g., CUSTOM variable),
	// we still need to mark its children as needing updates
	if (!topologicalOrder.includes(nodeToUpdate)) {
		// Mark direct children of the node as visited so they get processed
		(graph[nodeToUpdate] || []).forEach((child) => {
			visited.add(child);
		});
	}

	// Start processing from the node to update
	topologicalOrder.forEach((node) => {
		if (node === nodeToUpdate || visited.has(node)) {
			visited.add(node);
			callback(node);
			(graph[node] || []).forEach((child) => {
				visited.add(child);
			});
		}
	});
};

export const getOptionsForDynamicVariable = (
	normalizedValues: (string | number | boolean)[],
	relatedValues: string[],
): OptionData[] => {
	const options: OptionData[] = [];

	if (relatedValues.length > 0) {
		// Add Related Values group
		options.push({
			label: 'Related Values',
			value: 'relatedValues',
			options: relatedValues.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		});

		// Add All Values group (complete union - shows everything)
		options.push({
			label: 'All Values',
			value: 'allValues',
			options: normalizedValues.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		});

		return options;
	}

	return normalizedValues.map((option) => ({
		label: option.toString(),
		value: option.toString(),
	}));
};

export const uniqueOptions = (options: OptionData[]): OptionData[] => {
	const uniqueOptions: OptionData[] = [];
	const seenValues = new Set<string>();

	options.forEach((option) => {
		const value = option.value || '';
		if (seenValues.has(value)) {
			return;
		}
		seenValues.add(value);
		uniqueOptions.push(option);
	});

	return uniqueOptions;
};

export const getSelectValue = (
	selectedValue: IDashboardVariable['selectedValue'],
	variableData: IDashboardVariable,
): string | string[] | undefined => {
	if (Array.isArray(selectedValue)) {
		if (!variableData.multiSelect && selectedValue.length === 1) {
			return selectedValue[0]?.toString();
		}
		return selectedValue.map((item) => item.toString());
	}
	return selectedValue?.toString();
};

/**
 * Merges multiple arrays of values into a single deduplicated string array.
 */
export function mergeUniqueStrings(
	...arrays: (string | number | boolean)[][]
): string[] {
	return [...new Set(arrays.flatMap((arr) => arr.map((v) => v.toString())))];
}

function isEligibleFilterVariable(
	variable: IDashboardVariable,
	currentVariableId: string,
): boolean {
	if (variable.id === currentVariableId) {
		return false;
	}
	if (variable.type !== 'DYNAMIC') {
		return false;
	}
	if (!variable.dynamicVariablesAttribute) {
		return false;
	}
	if (!variable.selectedValue || isEmpty(variable.selectedValue)) {
		return false;
	}
	return !(variable.showALLOption && variable.allSelected);
}

function formatQueryValue(val: string): string {
	const numValue = Number(val);
	if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
		return val;
	}
	return `'${val.replace(/'/g, "\\'")}'`;
}

function buildQueryPart(attribute: string, values: string[]): string {
	const formatted = values.map(formatQueryValue);
	if (formatted.length === 1) {
		return `${attribute} = ${formatted[0]}`;
	}
	return `${attribute} IN [${formatted.join(', ')}]`;
}

/**
 * Builds a filter query string from sibling dynamic variables' selected values.
 * e.g. `k8s.namespace.name IN ['zeus', 'gene'] AND doc_op_type = 'test'`
 */
export function buildExistingDynamicVariableQuery(
	existingVariables: IDashboardVariables | null,
	currentVariableId: string,
	hasDynamicAttribute: boolean,
): string {
	if (!existingVariables || !hasDynamicAttribute) {
		return '';
	}

	const queryParts: string[] = [];

	for (const variable of Object.values(existingVariables)) {
		// Skip the current variable being processed
		if (!isEligibleFilterVariable(variable, currentVariableId)) {
			continue;
		}

		const rawValues = Array.isArray(variable.selectedValue)
			? variable.selectedValue
			: [variable.selectedValue];

		// Filter out empty values and convert to strings
		const validValues = rawValues
			.filter(
				(val): val is string | number | boolean =>
					val !== null && val !== undefined && val !== '',
			)
			.map((val) => val.toString());

		if (validValues.length > 0 && variable.dynamicVariablesAttribute) {
			queryParts.push(
				buildQueryPart(variable.dynamicVariablesAttribute, validValues),
			);
		}
	}

	return queryParts.join(' AND ');
}

function isVariableInActiveFetchState(state: string | undefined): boolean {
	return state === 'loading' || state === 'revalidating';
}

/**
 * Completes or fails a variable's fetch state machine transition.
 * No-ops if the variable is not currently in an active fetch state.
 */
export function settleVariableFetch(
	name: string | undefined,
	outcome: 'complete' | 'failure',
): void {
	if (!name) {
		return;
	}

	const currentState = variableFetchStore.getSnapshot().states[name];
	if (!isVariableInActiveFetchState(currentState)) {
		return;
	}

	if (outcome === 'complete') {
		onVariableFetchComplete(name);
	} else {
		onVariableFetchFailure(name);
	}
}

export function extractErrorMessage(
	error: { message?: string } | null,
): string {
	if (!error) {
		return SOMETHING_WENT_WRONG;
	}
	return (
		error.message ||
		'Please make sure configuration is valid and you have required setup and permissions'
	);
}
