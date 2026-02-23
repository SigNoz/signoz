import { IDashboardVariable } from 'types/api/dashboard/getAll';

import {
	dashboardVariablesStore,
	getVariableDependencyContext,
	setDashboardVariablesStore,
	updateDashboardVariablesStore,
} from '../dashboardVariablesStore';
import { IDashboardVariables } from '../dashboardVariablesStoreTypes';

function createVariable(
	overrides: Partial<IDashboardVariable> = {},
): IDashboardVariable {
	return {
		id: 'test-id',
		name: 'test-var',
		description: '',
		type: 'QUERY',
		sort: 'DISABLED',
		showALLOption: false,
		multiSelect: false,
		order: 0,
		...overrides,
	};
}

function resetStore(): void {
	dashboardVariablesStore.set(() => ({
		dashboardId: '',
		variables: {},
		sortedVariablesArray: [],
		dependencyData: null,
		variableTypes: {},
		dynamicVariableOrder: [],
	}));
}

describe('dashboardVariablesStore', () => {
	beforeEach(() => {
		resetStore();
	});

	describe('setDashboardVariablesStore', () => {
		it('should set the dashboard variables and compute derived values', () => {
			const variables: IDashboardVariables = {
				env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
			};

			setDashboardVariablesStore({ dashboardId: 'dash-1', variables });

			const storeSnapshot = dashboardVariablesStore.getSnapshot();
			expect(storeSnapshot.dashboardId).toBe('dash-1');
			expect(storeSnapshot.variables).toEqual(variables);
			expect(storeSnapshot.variableTypes).toEqual({ env: 'QUERY' });
			expect(storeSnapshot.sortedVariablesArray).toHaveLength(1);
		});
	});

	describe('updateDashboardVariablesStore', () => {
		it('should update variables and recompute derived values', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
				},
			});

			const updatedVariables: IDashboardVariables = {
				env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
				dyn1: createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
			};

			updateDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: updatedVariables,
			});

			const storeSnapshot = dashboardVariablesStore.getSnapshot();
			expect(storeSnapshot.variableTypes).toEqual({
				env: 'QUERY',
				dyn1: 'DYNAMIC',
			});
			expect(storeSnapshot.dynamicVariableOrder).toEqual(['dyn1']);
		});

		it('should replace dashboardId when it does not match', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					'not-there': createVariable({ name: 'not-there', order: 0 }),
				},
			});

			updateDashboardVariablesStore({
				dashboardId: 'dash-2',
				variables: {
					a: createVariable({ name: 'a', order: 0 }),
				},
			});

			const storeSnapshot = dashboardVariablesStore.getSnapshot();
			expect(storeSnapshot.dashboardId).toBe('dash-2');
			expect(storeSnapshot.variableTypes).toEqual({
				a: 'QUERY',
			});
			expect(storeSnapshot.variableTypes).not.toEqual({
				'not-there': 'QUERY',
			});
		});
	});

	describe('getVariableDependencyContext', () => {
		it('should return context with all fields', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 0,
						selectedValue: 'prod',
					}),
				},
			});

			const {
				variableTypes,
				dynamicVariableOrder,
				dependencyData,
			} = getVariableDependencyContext();

			expect(variableTypes).toEqual({ env: 'QUERY' });
			expect(dynamicVariableOrder).toEqual([]);
			expect(dependencyData).not.toBeNull();
		});

		it('should report doAllVariablesHaveValuesSelected as true when all variables have selectedValue', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 0,
						selectedValue: 'prod',
					}),
					region: createVariable({
						name: 'region',
						type: 'CUSTOM',
						order: 1,
						selectedValue: 'us-east',
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(true);
		});

		it('should report doAllVariablesHaveValuesSelected as false when some variables lack selectedValue', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 0,
						selectedValue: 'prod',
					}),
					region: createVariable({
						name: 'region',
						type: 'CUSTOM',
						order: 1,
						selectedValue: undefined,
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(false);
		});

		it('should treat DYNAMIC variable with allSelected=true and selectedValue=null as having a value', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 0,
						selectedValue: null as any,
						allSelected: true,
					}),
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 1,
						selectedValue: 'prod',
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(true);
		});

		it('should treat DYNAMIC variable with allSelected=true and selectedValue=undefined as having a value', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 0,
						selectedValue: undefined,
						allSelected: true,
					}),
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 1,
						selectedValue: 'prod',
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(true);
		});

		it('should treat DYNAMIC variable with allSelected=true and empty string selectedValue as having a value', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 0,
						selectedValue: '',
						allSelected: true,
					}),
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 1,
						selectedValue: 'prod',
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(true);
		});

		it('should treat DYNAMIC variable with allSelected=true and empty array selectedValue as having a value', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 0,
						selectedValue: [] as any,
						allSelected: true,
					}),
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 1,
						selectedValue: 'prod',
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(true);
		});

		it('should report false when a DYNAMIC variable has empty selectedValue and allSelected is not true', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 0,
						selectedValue: '',
						allSelected: false,
					}),
				},
			});

			const { doAllVariablesHaveValuesSelected } = getVariableDependencyContext();
			expect(doAllVariablesHaveValuesSelected).toBe(false);
		});
	});
});
