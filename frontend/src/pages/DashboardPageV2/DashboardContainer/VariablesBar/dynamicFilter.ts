import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from './selectionTypes';

function formatQueryValue(val: string): string {
	const num = Number(val);
	if (!Number.isNaN(num) && Number.isFinite(num)) {
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
 * Builds a filter expression from the OTHER dynamic variables' current
 * selections (e.g. `k8s.namespace.name IN ['prod'] AND service = 'api'`), so a
 * dynamic variable's option list is scoped by its sibling selections. Variables
 * in the ALL state, with no selection, or non-dynamic are skipped. Ported from
 * the V1 dynamic-variable runtime.
 */
export function buildExistingDynamicVariableQuery(
	variables: VariableFormModel[],
	selections: VariableSelectionMap,
	currentName: string,
): string {
	const parts: string[] = [];
	variables.forEach((variable) => {
		if (
			variable.name === currentName ||
			variable.type !== 'DYNAMIC' ||
			!variable.dynamicAttribute
		) {
			return;
		}
		const selection = selections[variable.name];
		if (!selection || selection.allSelected) {
			return;
		}
		const raw = Array.isArray(selection.value)
			? selection.value
			: [selection.value];
		const valid = raw
			.filter((v) => v !== null && v !== undefined && v !== '')
			.map((v) => String(v));
		if (valid.length > 0) {
			parts.push(buildQueryPart(variable.dynamicAttribute, valid));
		}
	});
	return parts.join(' AND ');
}
