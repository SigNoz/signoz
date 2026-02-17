import { act, renderHook } from '@testing-library/react';
import { dashboardVariablesStore } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import { IDashboardVariablesStoreState } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import {
	VariableFetchState,
	variableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { useIsPanelWaitingOnVariable } from '../useVariableFetchState';

function makeVariable(
	overrides: Partial<IDashboardVariable> & { id: string },
): IDashboardVariable {
	return {
		name: overrides.id,
		description: '',
		type: 'QUERY',
		sort: 'DISABLED',
		multiSelect: false,
		showALLOption: false,
		...overrides,
	};
}

function resetStores(): void {
	variableFetchStore.set(() => ({
		states: {},
		lastUpdated: {},
		cycleIds: {},
	}));
	dashboardVariablesStore.set(() => ({
		dashboardId: '',
		variables: {},
		sortedVariablesArray: [],
		dependencyData: null,
		variableTypes: {},
		dynamicVariableOrder: [],
	}));
}

function setFetchStates(states: Record<string, VariableFetchState>): void {
	variableFetchStore.set(() => ({
		states,
		lastUpdated: {},
		cycleIds: {},
	}));
}

function setDashboardVariables(
	overrides: Partial<IDashboardVariablesStoreState>,
): void {
	dashboardVariablesStore.set(() => ({
		dashboardId: '',
		variables: {},
		sortedVariablesArray: [],
		dependencyData: null,
		variableTypes: {},
		dynamicVariableOrder: [],
		...overrides,
	}));
}

describe('useIsPanelWaitingOnVariable', () => {
	beforeEach(() => {
		resetStores();
	});

	it('should return false when variableNames is empty', () => {
		const { result } = renderHook(() => useIsPanelWaitingOnVariable([]));
		expect(result.current).toBe(false);
	});

	it('should return false when all referenced variables are idle', () => {
		setFetchStates({ a: 'idle', b: 'idle' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: 'val1' }),
				b: makeVariable({ id: 'b', selectedValue: 'val2' }),
			},
			variableTypes: { a: 'QUERY', b: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a', 'b']));
		expect(result.current).toBe(false);
	});

	it('should return true when a variable is loading with empty selectedValue', () => {
		setFetchStates({ a: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: undefined }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(true);
	});

	it('should return true when a variable is waiting with empty selectedValue', () => {
		setFetchStates({ a: 'waiting' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: '' }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(true);
	});

	it('should return true when a variable is revalidating with empty selectedValue', () => {
		setFetchStates({ a: 'revalidating' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: undefined }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(true);
	});

	it('should return false when a variable is loading but has a selectedValue', () => {
		setFetchStates({ a: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: 'some-value' }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(false);
	});

	it('should return true for DYNAMIC variable with allSelected=true that is loading', () => {
		setFetchStates({ dyn: 'loading' });
		setDashboardVariables({
			variables: {
				dyn: makeVariable({
					id: 'dyn',
					type: 'DYNAMIC',
					selectedValue: 'some-val',
					allSelected: true,
				}),
			},
			variableTypes: { dyn: 'DYNAMIC' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['dyn']));
		expect(result.current).toBe(true);
	});

	it('should return true for DYNAMIC variable with allSelected=true that is waiting', () => {
		setFetchStates({ dyn: 'waiting' });
		setDashboardVariables({
			variables: {
				dyn: makeVariable({
					id: 'dyn',
					type: 'DYNAMIC',
					selectedValue: 'val',
					allSelected: true,
				}),
			},
			variableTypes: { dyn: 'DYNAMIC' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['dyn']));
		expect(result.current).toBe(true);
	});

	it('should return false for DYNAMIC variable with allSelected=true that is idle', () => {
		setFetchStates({ dyn: 'idle' });
		setDashboardVariables({
			variables: {
				dyn: makeVariable({
					id: 'dyn',
					type: 'DYNAMIC',
					selectedValue: 'val',
					allSelected: true,
				}),
			},
			variableTypes: { dyn: 'DYNAMIC' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['dyn']));
		expect(result.current).toBe(false);
	});

	it('should return false for non-DYNAMIC variable with allSelected=false and non-empty value that is loading', () => {
		setFetchStates({ a: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({
					id: 'a',
					selectedValue: 'val',
					allSelected: false,
				}),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(false);
	});

	it('should return true if any one of multiple variables is blocking', () => {
		setFetchStates({ a: 'idle', b: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: 'val' }),
				b: makeVariable({ id: 'b', selectedValue: undefined }),
			},
			variableTypes: { a: 'QUERY', b: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a', 'b']));
		expect(result.current).toBe(true);
	});

	it('should return false when variable has no entry in fetch store (treated as idle)', () => {
		setFetchStates({}); // no state entry for 'a'
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: 'val' }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(false);
	});

	it('should return false when variable is in error state with empty selectedValue', () => {
		setFetchStates({ a: 'error' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: undefined }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(false);
	});

	it('should react to store updates', () => {
		setFetchStates({ a: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: undefined }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(true);

		// Simulate variable fetch completing
		act(() => {
			variableFetchStore.update((d) => {
				d.states.a = 'idle';
			});
		});

		expect(result.current).toBe(false);
	});

	it('should handle DYNAMIC variable with allSelected=false and empty selectedValue as blocking', () => {
		setFetchStates({ dyn: 'loading' });
		setDashboardVariables({
			variables: {
				dyn: makeVariable({
					id: 'dyn',
					type: 'DYNAMIC',
					selectedValue: undefined,
					allSelected: false,
				}),
			},
			variableTypes: { dyn: 'DYNAMIC' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['dyn']));
		expect(result.current).toBe(true);
	});

	it('should handle variable with array selectedValue as non-blocking when loading', () => {
		setFetchStates({ a: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: ['val1', 'val2'] }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(false);
	});

	it('should handle variable with empty array selectedValue as blocking when loading', () => {
		setFetchStates({ a: 'loading' });
		setDashboardVariables({
			variables: {
				a: makeVariable({ id: 'a', selectedValue: [] }),
			},
			variableTypes: { a: 'QUERY' },
		});

		const { result } = renderHook(() => useIsPanelWaitingOnVariable(['a']));
		expect(result.current).toBe(true);
	});
});
