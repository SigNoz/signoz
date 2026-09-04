import { computeVariableDependencies } from '../../../VariablesBar/utils/variableDependencies';
import type { VariableFormModel } from '../variableFormModel';

/**
 * Detects a circular reference among QUERY variables (a query referencing
 * another that, transitively, references it back).
 *
 * Returns the names forming the cycle, or `null` when the set is acyclic.
 */
export function detectVariableCycle(
	variables: VariableFormModel[],
): string[] | null {
	const { hasCycle, cycleNodes } = computeVariableDependencies(
		variables.filter((variable) => variable.name),
	);

	return hasCycle ? (cycleNodes ?? []) : null;
}
