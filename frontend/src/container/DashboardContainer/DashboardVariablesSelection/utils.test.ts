jest.mock('providers/Dashboard/store/variableFetchStore', () => ({
	variableFetchStore: {
		getSnapshot: jest.fn(),
	},
	onVariableFetchComplete: jest.fn(),
	onVariableFetchFailure: jest.fn(),
}));

import {
	onVariableFetchComplete,
	onVariableFetchFailure,
	variableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import {
	areArraysEqual,
	buildExistingDynamicVariableQuery,
	extractErrorMessage,
	mergeUniqueStrings,
	onUpdateVariableNode,
	settleVariableFetch,
	VariableGraph,
} from './util';

// ────────────────────────────────────────────────────────────────
// Existing tests
// ────────────────────────────────────────────────────────────────

describe('areArraysEqual', () => {
	it('should return true for equal arrays with same order', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5, 'hello'];
		expect(areArraysEqual(array1, array2)).toBe(true);
	});

	it('should return false for equal arrays with different order', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = ['hello', 1, true, 'a', 5];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return false for arrays with different lengths', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return false for arrays with different elements', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5, 'world'];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return true for empty arrays', () => {
		const array1: string[] = [];
		const array2: string[] = [];
		expect(areArraysEqual(array1, array2)).toBe(true);
	});
});

describe('onUpdateVariableNode', () => {
	// Graph structure:
	// deployment -> namespace -> service -> pod
	// deployment has no parents, namespace depends on deployment, etc.
	const graph: VariableGraph = {
		deployment: ['namespace'],
		namespace: ['service'],
		service: ['pod'],
		pod: [],
		customVar: ['namespace'], // CUSTOM variable that affects namespace
	};

	const topologicalOrder = ['deployment', 'namespace', 'service', 'pod'];

	it('should call callback for the node and all its descendants', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('deployment', graph, topologicalOrder, callback);

		expect(visited).toEqual(['deployment', 'namespace', 'service', 'pod']);
	});

	it('should call callback starting from a middle node', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('namespace', graph, topologicalOrder, callback);

		expect(visited).toEqual(['namespace', 'service', 'pod']);
	});

	it('should only call callback for the leaf node when updating leaf', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('pod', graph, topologicalOrder, callback);

		expect(visited).toEqual(['pod']);
	});

	it('should handle CUSTOM variable not in topologicalOrder by updating its children', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		// customVar is not in topologicalOrder but has namespace as a child
		onUpdateVariableNode('customVar', graph, topologicalOrder, callback);

		// Should process namespace and its descendants (service, pod)
		expect(visited).toEqual(['namespace', 'service', 'pod']);
	});

	it('should handle node not in graph gracefully', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('unknownNode', graph, topologicalOrder, callback);

		// Should not call callback for any node since unknownNode has no children
		expect(visited).toEqual([]);
	});

	it('should handle empty graph', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('deployment', {}, topologicalOrder, callback);

		// deployment is in topologicalOrder, so callback is called for it
		expect(visited).toEqual(['deployment']);
	});

	it('should handle empty topologicalOrder', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('deployment', graph, [], callback);

		expect(visited).toEqual([]);
	});

	it('should handle CUSTOM variable with multiple children', () => {
		const graphWithMultipleChildren: VariableGraph = {
			...graph,
			customMulti: ['namespace', 'service'], // CUSTOM variable affecting multiple nodes
		};

		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode(
			'customMulti',
			graphWithMultipleChildren,
			topologicalOrder,
			callback,
		);

		// Should process namespace, service, and pod (descendants)
		expect(visited).toEqual(['namespace', 'service', 'pod']);
	});
});

// ────────────────────────────────────────────────────────────────
// New tests for functions added in recent commits
// ────────────────────────────────────────────────────────────────

function makeDynamicVar(
	overrides: Partial<IDashboardVariable> & { id: string },
): IDashboardVariable {
	return {
		name: overrides.id,
		description: '',
		type: 'DYNAMIC',
		sort: 'DISABLED',
		multiSelect: false,
		showALLOption: false,
		allSelected: false,
		dynamicVariablesAttribute: 'attr',
		selectedValue: 'some-value',
		...overrides,
	} as IDashboardVariable;
}

describe('mergeUniqueStrings', () => {
	it('should merge two arrays and deduplicate', () => {
		expect(mergeUniqueStrings(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
	});

	it('should convert numbers and booleans to strings', () => {
		expect(mergeUniqueStrings([1, true, 'hello'], [2, false])).toEqual([
			'1',
			'true',
			'hello',
			'2',
			'false',
		]);
	});

	it('should deduplicate when number and its string form both appear', () => {
		expect(mergeUniqueStrings([42], ['42'])).toEqual(['42']);
	});

	it('should handle a single array', () => {
		expect(mergeUniqueStrings(['x', 'y', 'x'])).toEqual(['x', 'y']);
	});

	it('should handle three or more arrays', () => {
		expect(mergeUniqueStrings(['a'], ['b'], ['c'], ['a', 'c'])).toEqual([
			'a',
			'b',
			'c',
		]);
	});

	it('should return empty array when no arrays are provided', () => {
		expect(mergeUniqueStrings()).toEqual([]);
	});

	it('should return empty array when all input arrays are empty', () => {
		expect(mergeUniqueStrings([], [], [])).toEqual([]);
	});

	it('should preserve order of first occurrence', () => {
		expect(mergeUniqueStrings(['c', 'a'], ['b', 'a'])).toEqual(['c', 'a', 'b']);
	});
});

describe('buildExistingDynamicVariableQuery', () => {
	// --- Guard clauses ---
	it('should return empty string when existingVariables is null', () => {
		expect(buildExistingDynamicVariableQuery(null, 'v1', true)).toBe('');
	});

	it('should return empty string when hasDynamicAttribute is false', () => {
		const variables = { v2: makeDynamicVar({ id: 'v2' }) };
		expect(buildExistingDynamicVariableQuery(variables, 'v1', false)).toBe('');
	});

	// --- Eligibility filtering ---
	it('should skip the current variable (same id)', () => {
		const variables = {
			v1: makeDynamicVar({
				id: 'v1',
				dynamicVariablesAttribute: 'ns',
				selectedValue: 'prod',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should skip non-DYNAMIC variables', () => {
		const variables = {
			v2: makeDynamicVar({ id: 'v2', type: 'QUERY' as any }),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should skip variables without dynamicVariablesAttribute', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: undefined,
				selectedValue: 'val',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should skip variables with null selectedValue', () => {
		const variables = {
			v2: makeDynamicVar({ id: 'v2', selectedValue: null }),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should skip variables with empty string selectedValue', () => {
		const variables = {
			v2: makeDynamicVar({ id: 'v2', selectedValue: '' }),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should skip variables with empty array selectedValue', () => {
		const variables = {
			v2: makeDynamicVar({ id: 'v2', selectedValue: [] }),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should skip variables where showALLOption and allSelected are both true', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				showALLOption: true,
				allSelected: true,
				dynamicVariablesAttribute: 'ns',
				selectedValue: 'prod',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});

	it('should include variable with showALLOption true but allSelected false', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				showALLOption: true,
				allSelected: false,
				dynamicVariablesAttribute: 'ns',
				selectedValue: 'prod',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"ns = 'prod'",
		);
	});

	// --- Value formatting ---
	it('should quote string values in the query', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'k8s.namespace.name',
				selectedValue: 'zeus',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"k8s.namespace.name = 'zeus'",
		);
	});

	it('should leave numeric values unquoted', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'http.status_code',
				selectedValue: '200',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			'http.status_code = 200',
		);
	});

	it('should escape single quotes in string values', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'user.name',
				selectedValue: "O'Brien",
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"user.name = 'O\\'Brien'",
		);
	});

	it('should build an IN clause for array selectedValue with multiple items', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'k8s.namespace.name',
				selectedValue: ['zeus', 'gene'],
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"k8s.namespace.name IN ['zeus', 'gene']",
		);
	});

	it('should handle mix of numeric and string values in IN clause', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'http.status_code',
				selectedValue: ['200', 'unknown'],
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"http.status_code IN [200, 'unknown']",
		);
	});

	it('should filter out empty string values from array', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'region',
				selectedValue: ['us-east', '', 'eu-west'],
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"region IN ['us-east', 'eu-west']",
		);
	});

	// --- Multiple siblings ---
	it('should join multiple sibling variables with AND', () => {
		const variables = {
			v2: makeDynamicVar({
				id: 'v2',
				dynamicVariablesAttribute: 'k8s.namespace.name',
				selectedValue: ['zeus', 'gene'],
			}),
			v3: makeDynamicVar({
				id: 'v3',
				dynamicVariablesAttribute: 'doc_op_type',
				selectedValue: 'test',
			}),
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe(
			"k8s.namespace.name IN ['zeus', 'gene'] AND doc_op_type = 'test'",
		);
	});

	it('should return empty string when no variables are eligible', () => {
		const variables = {
			v1: makeDynamicVar({ id: 'v1' }), // same as current — skipped
			v2: makeDynamicVar({ id: 'v2', type: 'QUERY' as any }), // not DYNAMIC
			v3: makeDynamicVar({ id: 'v3', selectedValue: null }), // no value
		};
		expect(buildExistingDynamicVariableQuery(variables, 'v1', true)).toBe('');
	});
});

describe('settleVariableFetch', () => {
	const mockGetSnapshot = variableFetchStore.getSnapshot as jest.Mock;
	const mockComplete = onVariableFetchComplete as jest.Mock;
	const mockFailure = onVariableFetchFailure as jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should no-op when name is undefined', () => {
		settleVariableFetch(undefined, 'complete');
		expect(mockGetSnapshot).not.toHaveBeenCalled();
		expect(mockComplete).not.toHaveBeenCalled();
		expect(mockFailure).not.toHaveBeenCalled();
	});

	it.each(['idle', 'waiting', 'error', undefined] as const)(
		'should no-op when variable state is %s',
		(state) => {
			mockGetSnapshot.mockReturnValue({ states: { myVar: state } });
			settleVariableFetch('myVar', 'complete');
			expect(mockComplete).not.toHaveBeenCalled();
			expect(mockFailure).not.toHaveBeenCalled();
		},
	);

	it('should call onVariableFetchComplete when state is loading and outcome is complete', () => {
		mockGetSnapshot.mockReturnValue({ states: { myVar: 'loading' } });
		settleVariableFetch('myVar', 'complete');
		expect(mockComplete).toHaveBeenCalledWith('myVar');
		expect(mockFailure).not.toHaveBeenCalled();
	});

	it('should call onVariableFetchComplete when state is revalidating and outcome is complete', () => {
		mockGetSnapshot.mockReturnValue({ states: { myVar: 'revalidating' } });
		settleVariableFetch('myVar', 'complete');
		expect(mockComplete).toHaveBeenCalledWith('myVar');
		expect(mockFailure).not.toHaveBeenCalled();
	});

	it('should call onVariableFetchFailure when state is loading and outcome is failure', () => {
		mockGetSnapshot.mockReturnValue({ states: { myVar: 'loading' } });
		settleVariableFetch('myVar', 'failure');
		expect(mockFailure).toHaveBeenCalledWith('myVar');
		expect(mockComplete).not.toHaveBeenCalled();
	});

	it('should call onVariableFetchFailure when state is revalidating and outcome is failure', () => {
		mockGetSnapshot.mockReturnValue({ states: { myVar: 'revalidating' } });
		settleVariableFetch('myVar', 'failure');
		expect(mockFailure).toHaveBeenCalledWith('myVar');
		expect(mockComplete).not.toHaveBeenCalled();
	});
});

describe('extractErrorMessage', () => {
	const FALLBACK_MESSAGE =
		'Please make sure configuration is valid and you have required setup and permissions';

	it('should return SOMETHING_WENT_WRONG when error is null', () => {
		expect(extractErrorMessage(null)).toBe('Something went wrong');
	});

	it('should return the error message when it exists', () => {
		expect(extractErrorMessage({ message: 'Query timeout' })).toBe(
			'Query timeout',
		);
	});

	it('should return fallback when error object has no message property', () => {
		expect(extractErrorMessage({})).toBe(FALLBACK_MESSAGE);
	});

	it('should return fallback when error.message is empty string', () => {
		expect(extractErrorMessage({ message: '' })).toBe(FALLBACK_MESSAGE);
	});

	it('should return fallback when error.message is undefined', () => {
		expect(extractErrorMessage({ message: undefined })).toBe(FALLBACK_MESSAGE);
	});
});
