import { isEmpty } from 'lodash-es';
import { IDashboardVariables } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import {
	onVariableFetchComplete,
	onVariableFetchFailure,
	variableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

function isEligibleFilterVariable(
	variable: IDashboardVariable,
	currentVariableId: string,
): boolean {
	if (variable.id === currentVariableId) {
		return false;
	}
	if (variable.type !== 'DYNAMIC') {
		return false;
	}
	if (!variable.dynamicVariablesAttribute) {
		return false;
	}
	if (!variable.selectedValue || isEmpty(variable.selectedValue)) {
		return false;
	}
	return !(variable.showALLOption && variable.allSelected);
}

function formatQueryValue(val: string): string {
	const numValue = Number(val);
	if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
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

export function buildExistingDynamicVariableQuery(
	existingVariables: IDashboardVariables | null,
	currentVariableId: string,
	hasDynamicAttribute: boolean,
): string {
	if (!existingVariables || !hasDynamicAttribute) {
		return '';
	}

	const queryParts: string[] = [];

	for (const variable of Object.values(existingVariables)) {
		if (!isEligibleFilterVariable(variable, currentVariableId)) {
			continue;
		}

		const rawValues = Array.isArray(variable.selectedValue)
			? variable.selectedValue
			: [variable.selectedValue];

		const validValues = rawValues
			.filter(
				(val): val is string | number | boolean =>
					val !== null && val !== undefined && val !== '',
			)
			.map((val) => val.toString());

		if (validValues.length > 0 && variable.dynamicVariablesAttribute) {
			queryParts.push(
				buildQueryPart(variable.dynamicVariablesAttribute, validValues),
			);
		}
	}

	return queryParts.join(' AND ');
}

function isVariableInActiveFetchState(state: string | undefined): boolean {
	return state === 'loading' || state === 'revalidating';
}

export function settleVariableFetch(
	name: string | undefined,
	outcome: 'complete' | 'failure',
): void {
	if (!name) {
		return;
	}

	const currentState = variableFetchStore.getSnapshot().states[name];
	if (!isVariableInActiveFetchState(currentState)) {
		return;
	}

	if (outcome === 'complete') {
		onVariableFetchComplete(name);
	} else {
		onVariableFetchFailure(name);
	}
}
