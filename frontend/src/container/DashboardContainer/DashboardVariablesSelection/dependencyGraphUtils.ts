import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';
import {
	IDependencyData,
	VariableGraph,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

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

export const buildDependencies = (
	variables: IDashboardVariable[],
): VariableGraph => {
	const graph: VariableGraph = {};

	variables.forEach((variable) => {
		if (variable.name) {
			graph[variable.name] = [];
		}
	});

	variables.forEach((variable) => {
		if (variable.name) {
			const dependentVariables = getDependentVariablesBasedOnVariableName(
				variable.name,
				variables,
			);

			graph[variable.name] = dependentVariables;
		}
	});

	return graph;
};

export const buildParentDependencyGraph = (
	graph: VariableGraph,
): VariableGraph => {
	const parentGraph: VariableGraph = {};

	Object.keys(graph).forEach((node) => {
		parentGraph[node] = [];
	});

	Object.entries(graph).forEach(([node, children]) => {
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
