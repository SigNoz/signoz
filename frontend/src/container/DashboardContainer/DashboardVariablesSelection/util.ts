import { OptionData } from 'components/NewSelect/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { IDashboardVariables } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import {
	buildExistingDynamicVariableQuery,
	settleVariableFetch,
} from './variableFetchActions';

export {
	buildDependencies,
	buildDependencyGraph,
	buildParentDependencyGraph,
} from './dependencyGraphUtils';
import type { VariableGraph } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';

export type { VariableGraph };

// Re-export functions from variableFetchActions so other modules can import
// them from './util' (existing code expects these to be available here).
export { buildExistingDynamicVariableQuery, settleVariableFetch };

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
): IDashboardVariables =>
	variblesArr.reduce((result, obj: IDashboardVariable) => {
		const { id } = obj;

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		result[id] = obj;
		return result;
	}, {});

export const onUpdateVariableNode = (
	nodeToUpdate: string,
	graph: VariableGraph,
	topologicalOrder: string[],
	callback: (node: string) => void,
): void => {
	const visited = new Set<string>();

	// If nodeToUpdate is not in topologicalOrder (e.g., CUSTOM variable),
	// we still need to mark its children as needing updates
	if (!topologicalOrder.includes(nodeToUpdate)) {
		// Mark direct children of the node as visited so they get processed
		(graph[nodeToUpdate] || []).forEach((child) => {
			visited.add(child);
		});
	}

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

export const getOptionsForDynamicVariable = (
	normalizedValues: (string | number | boolean)[],
	relatedValues: string[],
): OptionData[] => {
	const options: OptionData[] = [];

	if (relatedValues.length > 0) {
		// Add Related Values group
		options.push({
			label: 'Related Values',
			value: 'relatedValues',
			options: relatedValues.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		});

		// Add All Values group (complete union - shows everything)
		options.push({
			label: 'All Values',
			value: 'allValues',
			options: normalizedValues.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		});

		return options;
	}

	return normalizedValues.map((option) => ({
		label: option.toString(),
		value: option.toString(),
	}));
};

export const uniqueOptions = (options: OptionData[]): OptionData[] => {
	const uniqueOptions: OptionData[] = [];
	const seenValues = new Set<string>();

	options.forEach((option) => {
		const value = option.value || '';
		if (seenValues.has(value)) {
			return;
		}
		seenValues.add(value);
		uniqueOptions.push(option);
	});

	return uniqueOptions;
};

export const getSelectValue = (
	selectedValue: IDashboardVariable['selectedValue'],
	variableData: IDashboardVariable,
): string | string[] | undefined => {
	if (Array.isArray(selectedValue)) {
		if (!variableData.multiSelect && selectedValue.length === 1) {
			return selectedValue[0]?.toString();
		}
		return selectedValue.map((item) => item.toString());
	}
	return selectedValue?.toString();
};

/**
 * Merges multiple arrays of values into a single deduplicated string array.
 */
export function mergeUniqueStrings(
	...arrays: (string | number | boolean)[][]
): string[] {
	return [...new Set(arrays.flatMap((arr) => arr.map((v) => v.toString())))];
}

export function extractErrorMessage(
	error: { message?: string } | null,
): string {
	if (!error) {
		return SOMETHING_WENT_WRONG;
	}
	return (
		error.message ||
		'Please make sure configuration is valid and you have required setup and permissions'
	);
}
