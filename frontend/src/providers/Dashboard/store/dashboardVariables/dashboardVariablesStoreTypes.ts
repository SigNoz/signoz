import {
	IDashboardVariable,
	TVariableQueryType,
} from 'types/api/dashboard/getAll';

export type VariableGraph = Record<string, string[]>;

export interface IDependencyData {
	order: string[];
	// Direct children for each variable
	graph: VariableGraph;
	// Direct parents for each variable
	parentDependencyGraph: VariableGraph;
	// Pre-computed transitive descendants for each node (all reachable nodes, not just direct children)
	transitiveDescendants: VariableGraph;
	hasCycle: boolean;
	cycleNodes?: string[];
}

export type IDashboardVariables = Record<string, IDashboardVariable>;

export interface IDashboardVariablesStoreState {
	// dashboard id
	dashboardId: string;

	// Raw variables keyed by id/name
	variables: IDashboardVariables;

	// Derived: sorted array of variables by order
	sortedVariablesArray: IDashboardVariable[];

	// Derived: dependency data for QUERY variables
	dependencyData: IDependencyData | null;

	// Derived: variable name → type mapping
	variableTypes: Record<string, TVariableQueryType>;

	// Derived: display-ordered list of dynamic variable names
	dynamicVariableOrder: string[];
}

export interface IUseDashboardVariablesReturn {
	dashboardVariables: IDashboardVariablesStoreState['variables'];
}
