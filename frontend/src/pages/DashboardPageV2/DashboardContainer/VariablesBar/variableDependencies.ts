import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';

import type {
	VariableFormModel,
	VariableType,
} from '../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from './selectionTypes';
import { isResolved } from './selectionUtils';

/**
 * Inter-variable dependency graph for runtime selection. A QUERY variable
 * "depends on" another variable when its query text references that variable
 * (`{{.name}}`, `{{name}}`, `$name`, `[[name]]`). When a variable's value
 * changes, its dependent QUERY variables must refetch. Ported from the V1
 * dashboard-variables runtime; operates on the V2 flat variable model.
 */

export type VariableGraph = Record<string, string[]>;

export interface VariableDependencyData {
	/** Topological order of variables (parents before children). */
	order: string[];
	/** Direct children (dependents) of each variable. */
	graph: VariableGraph;
	/** Direct parents of each variable. */
	parentGraph: VariableGraph;
	/** All transitive descendants of each variable (precomputed). */
	transitiveDescendants: VariableGraph;
	hasCycle: boolean;
	cycleNodes?: string[];
}

/** Names of QUERY variables whose query references `variableName`. */
function getDependents(
	variableName: string,
	variables: VariableFormModel[],
): string[] {
	return variables
		.filter(
			(v) =>
				v.type === 'QUERY' &&
				!!v.name &&
				textContainsVariableReference(v.queryValue || '', variableName),
		)
		.map((v) => v.name);
}

/** variable name → its direct dependents (children). */
export function buildDependencies(
	variables: VariableFormModel[],
): VariableGraph {
	const graph: VariableGraph = {};
	variables.forEach((v) => {
		if (v.name) {
			graph[v.name] = getDependents(v.name, variables);
		}
	});
	return graph;
}

/** Invert a child graph into a parent graph. */
export function buildParentGraph(graph: VariableGraph): VariableGraph {
	const parents: VariableGraph = {};
	Object.keys(graph).forEach((node) => {
		parents[node] = parents[node] ?? [];
	});
	Object.entries(graph).forEach(([node, children]) => {
		children.forEach((child) => {
			parents[child] = parents[child] ?? [];
			parents[child].push(node);
		});
	});
	return parents;
}

function collectCyclePath(
	graph: VariableGraph,
	start: string,
	end: string,
): string[] {
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
}

function detectCycle(
	graph: VariableGraph,
	node: string,
	visited: Set<string>,
	recStack: Set<string>,
): string[] | null {
	if (!visited.has(node)) {
		visited.add(node);
		recStack.add(node);
		let cycleNodes: string[] | null = null;
		(graph[node] || []).some((neighbor) => {
			if (!visited.has(neighbor)) {
				const found = detectCycle(graph, neighbor, visited, recStack);
				if (found) {
					cycleNodes = found;
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
}

/** Build the full dependency data (topo order, parents, transitive descendants, cycle info). */
export function buildDependencyData(
	dependencies: VariableGraph,
): VariableDependencyData {
	const inDegree: Record<string, number> = {};
	const adjList: VariableGraph = {};

	Object.keys(dependencies).forEach((node) => {
		inDegree[node] = inDegree[node] ?? 0;
		adjList[node] = adjList[node] ?? [];
		(dependencies[node] || []).forEach((child) => {
			inDegree[child] = inDegree[child] ?? 0;
			inDegree[child] += 1;
			adjList[node].push(child);
		});
	});

	const visited = new Set<string>();
	const recStack = new Set<string>();
	let cycleNodes: string[] | undefined;
	Object.keys(dependencies).some((node) => {
		if (!visited.has(node)) {
			const found = detectCycle(dependencies, node, visited, recStack);
			if (found) {
				cycleNodes = found;
				return true;
			}
		}
		return false;
	});

	// Topological sort (Kahn's algorithm).
	const queue = Object.keys(inDegree).filter((n) => inDegree[n] === 0);
	const order: string[] = [];
	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) {
			break;
		}
		order.push(current);
		(adjList[current] || []).forEach((neighbor) => {
			inDegree[neighbor] -= 1;
			if (inDegree[neighbor] === 0) {
				queue.push(neighbor);
			}
		});
	}

	const hasCycle = order.length !== Object.keys(dependencies).length;

	// Transitive descendants: walk topo order in reverse.
	const transitiveDescendants: VariableGraph = {};
	for (let i = order.length - 1; i >= 0; i--) {
		const node = order[i];
		const desc = new Set<string>();
		(adjList[node] || []).forEach((child) => {
			desc.add(child);
			(transitiveDescendants[child] || []).forEach((d) => desc.add(d));
		});
		transitiveDescendants[node] = Array.from(desc);
	}

	return {
		order,
		graph: adjList,
		parentGraph: buildParentGraph(adjList),
		transitiveDescendants,
		hasCycle,
		cycleNodes,
	};
}

/** Compute the full dependency data straight from the variable list. */
export function computeVariableDependencies(
	variables: VariableFormModel[],
): VariableDependencyData {
	return buildDependencyData(buildDependencies(variables));
}

/**
 * Static context the runtime fetch engine (`variableFetchSlice`) needs to order
 * fetches: the dependency graph plus the per-name type index and the QUERY /
 * DYNAMIC fetch orders. Derived from the variable definitions; stable until the
 * spec's variables change. Mirrors V1's `getVariableDependencyContext`.
 */
export interface VariableFetchContext {
	dependencyData: VariableDependencyData;
	/** variable name → its type. */
	variableTypes: Record<string, VariableType>;
	/** QUERY variables in topological (parent-before-child) order. */
	queryVariableOrder: string[];
	/** DYNAMIC variable names (they implicitly depend on all QUERY values). */
	dynamicVariableOrder: string[];
}

export function deriveFetchContext(
	variables: VariableFormModel[],
): VariableFetchContext {
	const dependencyData = computeVariableDependencies(variables);
	const variableTypes: Record<string, VariableType> = {};
	variables.forEach((v) => {
		if (v.name) {
			variableTypes[v.name] = v.type;
		}
	});
	const queryVariableOrder = dependencyData.order.filter(
		(name) => variableTypes[name] === 'QUERY',
	);
	const dynamicVariableOrder = variables
		.filter((v) => v.type === 'DYNAMIC' && !!v.name)
		.map((v) => v.name);
	return {
		dependencyData,
		variableTypes,
		queryVariableOrder,
		dynamicVariableOrder,
	};
}

/**
 * Whether every QUERY variable already has a usable selection — decides at load
 * time whether dynamic variables may fetch immediately or must wait for the
 * query variables to settle first (V1 parity).
 */
export function doAllQueryVariablesHaveValues(
	variables: VariableFormModel[],
	selection: VariableSelectionMap,
): boolean {
	return variables
		.filter((v) => v.type === 'QUERY')
		.every((v) => isResolved(selection[v.name]));
}
