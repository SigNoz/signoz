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

			const { variableTypes, dynamicVariableOrder, dependencyData } =
				getVariableDependencyContext();

			expect(variableTypes).toEqual({ env: 'QUERY' });
			expect(dynamicVariableOrder).toEqual([]);
			expect(dependencyData).not.toBeNull();
		});

		it('should report doAllQueryVariablesHaveValuesSelected as true when all query variables have values', () => {
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
						type: 'QUERY',
						order: 1,
						selectedValue: 'us-east',
					}),
				},
			});

			const { doAllQueryVariablesHaveValuesSelected } =
				getVariableDependencyContext();
			expect(doAllQueryVariablesHaveValuesSelected).toBe(true);
		});

		it('should report doAllQueryVariablesHaveValuesSelected as false when a query variable lacks a selectedValue', () => {
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
						type: 'QUERY',
						order: 1,
						selectedValue: undefined,
					}),
				},
			});

			const { doAllQueryVariablesHaveValuesSelected } =
				getVariableDependencyContext();
			expect(doAllQueryVariablesHaveValuesSelected).toBe(false);
		});

		it('should ignore non-QUERY variables when computing doAllQueryVariablesHaveValuesSelected', () => {
			// env (QUERY) has a value; region (CUSTOM) and dyn1 (DYNAMIC) do not — they are ignored
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
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 2,
						selectedValue: '',
					}),
				},
			});

			const { doAllQueryVariablesHaveValuesSelected } =
				getVariableDependencyContext();
			expect(doAllQueryVariablesHaveValuesSelected).toBe(true);
		});

		it('should return true for doAllQueryVariablesHaveValuesSelected when there are no query variables', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					dyn1: createVariable({
						name: 'dyn1',
						type: 'DYNAMIC',
						order: 0,
						selectedValue: '',
					}),
				},
			});

			const { doAllQueryVariablesHaveValuesSelected } =
				getVariableDependencyContext();
			expect(doAllQueryVariablesHaveValuesSelected).toBe(true);
		});

		// Any non-nil, non-empty-array selectedValue is treated as selected
		it.each([
			{ label: 'numeric 0', selectedValue: 0 as number },
			{ label: 'boolean false', selectedValue: false as boolean },
			// ideally not possible but till we have concrete schema, we should not block dynamic variables
			{ label: 'empty string', selectedValue: '' },
			{
				label: 'non-empty array',
				selectedValue: ['a', 'b'] as (string | number | boolean)[],
			},
		])('should return true when selectedValue is $label', ({ selectedValue }) => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({
						name: 'env',
						type: 'QUERY',
						order: 0,
						selectedValue,
					}),
				},
			});

			const { doAllQueryVariablesHaveValuesSelected } =
				getVariableDependencyContext();
			expect(doAllQueryVariablesHaveValuesSelected).toBe(true);
		});

		// null/undefined (tested above) and empty array are treated as not selected
		it.each([
			{
				label: 'null',
				selectedValue: null as IDashboardVariable['selectedValue'],
			},
			{ label: 'empty array', selectedValue: [] as (string | number | boolean)[] },
		])(
			'should return false when selectedValue is $label',
			({ selectedValue }) => {
				setDashboardVariablesStore({
					dashboardId: 'dash-1',
					variables: {
						env: createVariable({
							name: 'env',
							type: 'QUERY',
							order: 0,
							selectedValue,
						}),
					},
				});

				const { doAllQueryVariablesHaveValuesSelected } =
					getVariableDependencyContext();
				expect(doAllQueryVariablesHaveValuesSelected).toBe(false);
			},
		);
	});
});
