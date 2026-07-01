import {
	buildDependencies,
	buildDependencyGraph,
} from 'container/DashboardContainer/DashboardVariablesSelection/util';
import type { IDashboardVariable } from 'types/api/dashboard/getAll';

import type { VariableFormModel } from './variableFormModel';

/**
 * Detects a circular reference among QUERY variables (a query referencing
 * another that, transitively, references it back). Reuses the V1 dependency
 * graph helpers, which key off `name` / `type` / `queryValue` only.
 *
 * Returns the names forming the cycle, or `null` when the set is acyclic.
 */
export function detectVariableCycle(
	variables: VariableFormModel[],
): string[] | null {
	const asDbVariables = variables
		.filter((variable) => variable.name)
		.map(
			(variable) =>
				({
					name: variable.name,
					type: variable.type,
					queryValue: variable.queryValue,
				}) as IDashboardVariable,
		);

	const { hasCycle, cycleNodes } = buildDependencyGraph(
		buildDependencies(asDbVariables),
	);

	return hasCycle ? (cycleNodes ?? []) : null;
}
