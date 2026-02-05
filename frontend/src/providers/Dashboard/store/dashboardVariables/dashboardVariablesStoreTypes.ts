import { IDashboardVariable } from 'types/api/dashboard/getAll';

export type VariableGraph = Record<string, string[]>;

export interface IDependencyData {
	order: string[];
	graph: VariableGraph;
	parentDependencyGraph: VariableGraph;
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
}
