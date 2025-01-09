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

// Function to build the dependency graph
export const buildDependencyGraph = (
	dependencies: VariableGraph,
): { order: string[]; graph: VariableGraph } => {
	const inDegree: Record<string, number> = {};
	const adjList: VariableGraph = {};

	// Initialize in-degree and adjacency list
	Object.keys(dependencies).forEach((node) => {
		if (!inDegree[node]) inDegree[node] = 0;
		if (!adjList[node]) adjList[node] = [];
		dependencies[node].forEach((child) => {
			if (!inDegree[child]) inDegree[child] = 0;
			inDegree[child]++;
			adjList[node].push(child);
		});
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

		adjList[current].forEach((neighbor) => {
			inDegree[neighbor]--;
			if (inDegree[neighbor] === 0) queue.push(neighbor);
		});
	}

	if (topologicalOrder.length !== Object.keys(dependencies).length) {
		console.error('Cycle detected in the dependency graph!');
	}

	return { order: topologicalOrder, graph: adjList };
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
			parentGraph[child].push(node);
		});
	});

	return parentGraph;
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

export interface IDependencyData {
	order: string[];
	graph: VariableGraph;
	parentDependencyGraph: VariableGraph;
}
