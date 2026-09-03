import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';
import { IDependencyData } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

/**
 * Inter-variable dependency graph over the shared dashboard-variables store. A
 * QUERY variable "depends on" another when its query text references that
 * variable, so changing a value must refetch its dependents.
 *
 * Keyed on `IDashboardVariable`. The V2 editor has a parallel implementation
 * over its own flat form model in
 * `pages/DashboardPageV2/DashboardContainer/VariablesBar/utils/variableDependencies.ts`.
 */

export type VariableGraph = Record<string, string[]>;

/** Names of QUERY variables whose query references `variableName`. */
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

/** variable name → its direct dependents (children). */
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

/** Invert a child graph into a parent graph. */
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

/** Topological order, parent graph, transitive descendants and cycle info. */
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
