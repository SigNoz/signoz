import { OptionData } from 'components/NewSelect/types';
import { isEmpty, isNull } from 'lodash-es';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';

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
): Dashboard['data']['variables'] =>
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
		?.map((variable: any) => {
			if (variable.type === 'QUERY') {
				// Combined pattern for all formats
				// {{.variable_name}} - original format
				// $variable_name - dollar prefix format
				// [[variable_name]] - square bracket format
				// {{variable_name}} - without dot format
				const patterns = [
					`\\{\\{\\s*?\\.${variableName}\\s*?\\}\\}`, // {{.var}}
					`\\{\\{\\s*${variableName}\\s*\\}\\}`, // {{var}}
					`\\$${variableName}\\b`, // $var
					`\\[\\[\\s*${variableName}\\s*\\]\\]`, // [[var]]
				];
				const combinedRegex = new RegExp(patterns.join('|'));

				const queryValue = variable.queryValue || '';
				const dependVarReMatch = queryValue.match(combinedRegex);
				if (dependVarReMatch !== null && dependVarReMatch.length > 0) {
					return variable.name;
				}
			}
			return null;
		})
		.filter((val: string | null) => !isNull(val));
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

export interface IDependencyData {
	order: string[];
	graph: VariableGraph;
	parentDependencyGraph: VariableGraph;
	hasCycle: boolean;
	cycleNodes?: string[];
}

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
		if (!parent) break;
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
		if (!inDegree[node]) inDegree[node] = 0;
		if (!adjList[node]) adjList[node] = [];
		dependencies[node]?.forEach((child) => {
			if (!inDegree[child]) inDegree[child] = 0;
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
			if (inDegree[neighbor] === 0) queue.push(neighbor);
		});
	}

	const hasCycle = topologicalOrder.length !== Object.keys(dependencies)?.length;

	return {
		order: topologicalOrder,
		graph: adjList,
		parentDependencyGraph: buildParentDependencyGraph(adjList),
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

export const checkAPIInvocation = (
	variablesToGetUpdated: string[],
	variableData: IDashboardVariable,
	parentDependencyGraph?: VariableGraph,
): boolean => {
	if (isEmpty(variableData.name)) {
		return false;
	}

	if (isEmpty(parentDependencyGraph)) {
		return false;
	}

	// if no dependency then true
	const haveDependency =
		parentDependencyGraph?.[variableData.name || '']?.length > 0;
	if (!haveDependency) {
		return true;
	}

	// if variable is in the list and has dependency then check if its the top element in the queue then true else false
	return (
		variablesToGetUpdated.length > 0 &&
		variablesToGetUpdated[0] === variableData.name
	);
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

export const uniqueValues = (values: string[] | string): string[] | string => {
	if (Array.isArray(values)) {
		const uniqueValues: string[] = [];
		const seenValues = new Set<string>();

		values.forEach((value) => {
			if (seenValues.has(value)) {
				return;
			}
			seenValues.add(value);
			uniqueValues.push(value);
		});

		return uniqueValues;
	}

	return values;
};
