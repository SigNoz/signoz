import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { IDashboardVariables } from '../dashboardVariablesStoreTypes';
import {
	buildDynamicVariableOrder,
	buildSortedVariablesArray,
	buildVariableTypesMap,
	computeDerivedValues,
} from '../dashboardVariablesStoreUtils';

const createVariable = (
	overrides: Partial<IDashboardVariable> = {},
): IDashboardVariable => ({
	id: 'test-id',
	name: 'test-var',
	description: '',
	type: 'QUERY',
	sort: 'DISABLED',
	showALLOption: false,
	multiSelect: false,
	order: 0,
	...overrides,
});

describe('dashboardVariablesStoreUtils', () => {
	describe('buildSortedVariablesArray', () => {
		it('should sort variables by order property', () => {
			const variables: IDashboardVariables = {
				c: createVariable({ name: 'c', order: 3 }),
				a: createVariable({ name: 'a', order: 1 }),
				b: createVariable({ name: 'b', order: 2 }),
			};

			const result = buildSortedVariablesArray(variables);

			expect(result.map((v) => v.name)).toEqual(['a', 'b', 'c']);
		});

		it('should return empty array for empty variables', () => {
			const result = buildSortedVariablesArray({});
			expect(result).toEqual([]);
		});

		it('should create copies of variables (not references)', () => {
			const original = createVariable({ name: 'a', order: 0 });
			const variables: IDashboardVariables = { a: original };

			const result = buildSortedVariablesArray(variables);

			expect(result[0]).not.toBe(original);
			expect(result[0]).toEqual(original);
		});
	});

	describe('buildVariableTypesMap', () => {
		it('should create a name-to-type mapping', () => {
			const sorted = [
				createVariable({ name: 'env', type: 'QUERY' }),
				createVariable({ name: 'region', type: 'CUSTOM' }),
				createVariable({ name: 'dynVar', type: 'DYNAMIC' }),
				createVariable({ name: 'text', type: 'TEXTBOX' }),
			];

			const result = buildVariableTypesMap(sorted);

			expect(result).toEqual({
				env: 'QUERY',
				region: 'CUSTOM',
				dynVar: 'DYNAMIC',
				text: 'TEXTBOX',
			});
		});

		it('should return empty object for empty array', () => {
			expect(buildVariableTypesMap([])).toEqual({});
		});
	});

	describe('buildDynamicVariableOrder', () => {
		it('should return only DYNAMIC variable names in order', () => {
			const sorted = [
				createVariable({ name: 'queryVar', type: 'QUERY', order: 0 }),
				createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
				createVariable({ name: 'customVar', type: 'CUSTOM', order: 2 }),
				createVariable({ name: 'dyn2', type: 'DYNAMIC', order: 3 }),
			];

			const result = buildDynamicVariableOrder(sorted);

			expect(result).toEqual(['dyn1', 'dyn2']);
		});

		it('should return empty array when no DYNAMIC variables exist', () => {
			const sorted = [
				createVariable({ name: 'a', type: 'QUERY' }),
				createVariable({ name: 'b', type: 'CUSTOM' }),
			];

			expect(buildDynamicVariableOrder(sorted)).toEqual([]);
		});

		it('should return empty array for empty input', () => {
			expect(buildDynamicVariableOrder([])).toEqual([]);
		});
	});

	describe('computeDerivedValues', () => {
		it('should compute all derived values from variables', () => {
			const variables: IDashboardVariables = {
				env: createVariable({
					name: 'env',
					type: 'QUERY',
					order: 0,
				}),
				dyn1: createVariable({
					name: 'dyn1',
					type: 'DYNAMIC',
					order: 1,
				}),
			};

			const result = computeDerivedValues(variables);

			expect(result.sortedVariablesArray).toHaveLength(2);
			expect(result.sortedVariablesArray[0].name).toBe('env');
			expect(result.sortedVariablesArray[1].name).toBe('dyn1');

			expect(result.variableTypes).toEqual({
				env: 'QUERY',
				dyn1: 'DYNAMIC',
			});

			expect(result.dynamicVariableOrder).toEqual(['dyn1']);

			// dependencyData should exist since there are variables
			expect(result.dependencyData).not.toBeNull();
		});

		it('should return null dependencyData for empty variables', () => {
			const result = computeDerivedValues({});

			expect(result.sortedVariablesArray).toEqual([]);
			expect(result.dependencyData).toBeNull();
			expect(result.variableTypes).toEqual({});
			expect(result.dynamicVariableOrder).toEqual([]);
		});

		it('should handle all four variable types together', () => {
			const variables: IDashboardVariables = {
				queryVar: createVariable({
					name: 'queryVar',
					type: 'QUERY',
					order: 0,
				}),
				customVar: createVariable({
					name: 'customVar',
					type: 'CUSTOM',
					order: 1,
				}),
				dynVar: createVariable({
					name: 'dynVar',
					type: 'DYNAMIC',
					order: 2,
				}),
				textVar: createVariable({
					name: 'textVar',
					type: 'TEXTBOX',
					order: 3,
				}),
			};

			const result = computeDerivedValues(variables);

			expect(result.sortedVariablesArray).toHaveLength(4);
			expect(result.sortedVariablesArray.map((v) => v.name)).toEqual([
				'queryVar',
				'customVar',
				'dynVar',
				'textVar',
			]);

			expect(result.variableTypes).toEqual({
				queryVar: 'QUERY',
				customVar: 'CUSTOM',
				dynVar: 'DYNAMIC',
				textVar: 'TEXTBOX',
			});

			expect(result.dynamicVariableOrder).toEqual(['dynVar']);
			expect(result.dependencyData).not.toBeNull();
		});

		it('should sort variables by order regardless of insertion order', () => {
			const variables: IDashboardVariables = {
				z: createVariable({ name: 'z', type: 'QUERY', order: 4 }),
				a: createVariable({ name: 'a', type: 'CUSTOM', order: 0 }),
				m: createVariable({ name: 'm', type: 'DYNAMIC', order: 2 }),
				b: createVariable({ name: 'b', type: 'TEXTBOX', order: 1 }),
				x: createVariable({ name: 'x', type: 'QUERY', order: 3 }),
			};

			const result = computeDerivedValues(variables);

			expect(result.sortedVariablesArray.map((v) => v.name)).toEqual([
				'a',
				'b',
				'm',
				'x',
				'z',
			]);
		});

		it('should include multiple dynamic variables in order', () => {
			const variables: IDashboardVariables = {
				dyn3: createVariable({ name: 'dyn3', type: 'DYNAMIC', order: 5 }),
				query1: createVariable({ name: 'query1', type: 'QUERY', order: 0 }),
				dyn1: createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
				custom1: createVariable({ name: 'custom1', type: 'CUSTOM', order: 2 }),
				dyn2: createVariable({ name: 'dyn2', type: 'DYNAMIC', order: 3 }),
			};

			const result = computeDerivedValues(variables);

			expect(result.dynamicVariableOrder).toEqual(['dyn1', 'dyn2', 'dyn3']);
		});

		it('should build dependency data with query variable order for dependent queries', () => {
			const variables: IDashboardVariables = {
				env: createVariable({
					name: 'env',
					type: 'QUERY',
					order: 0,
					queryValue: 'SELECT DISTINCT env FROM table',
				}),
				service: createVariable({
					name: 'service',
					type: 'QUERY',
					order: 1,
					queryValue: 'SELECT DISTINCT service FROM table WHERE env={{.env}}',
				}),
			};

			const result = computeDerivedValues(variables);

			const { dependencyData } = result;
			expect(dependencyData).not.toBeNull();
			// env should appear in the dependency order (it's a root QUERY variable)
			expect(dependencyData?.order).toContain('env');
			// service depends on env, so it should also be in the order
			expect(dependencyData?.order).toContain('service');
			// env comes before service in topological order
			const envIdx = dependencyData?.order.indexOf('env') ?? -1;
			const svcIdx = dependencyData?.order.indexOf('service') ?? -1;
			expect(envIdx).toBeLessThan(svcIdx);
		});

		it('should not include non-QUERY variables in dependency order', () => {
			const variables: IDashboardVariables = {
				env: createVariable({
					name: 'env',
					type: 'QUERY',
					order: 0,
					queryValue: 'SELECT DISTINCT env FROM table',
				}),
				customVar: createVariable({
					name: 'customVar',
					type: 'CUSTOM',
					order: 1,
				}),
				dynVar: createVariable({
					name: 'dynVar',
					type: 'DYNAMIC',
					order: 2,
				}),
				textVar: createVariable({
					name: 'textVar',
					type: 'TEXTBOX',
					order: 3,
				}),
			};

			const result = computeDerivedValues(variables);

			expect(result.dependencyData).not.toBeNull();
			// Only QUERY variables should be in the dependency order
			result.dependencyData?.order.forEach((name) => {
				expect(result.variableTypes[name]).toBe('QUERY');
			});
		});

		it('should produce transitive descendants in dependency data', () => {
			const variables: IDashboardVariables = {
				region: createVariable({
					name: 'region',
					type: 'QUERY',
					order: 0,
					queryValue: 'SELECT region FROM table',
				}),
				cluster: createVariable({
					name: 'cluster',
					type: 'QUERY',
					order: 1,
					queryValue: 'SELECT cluster FROM table WHERE region={{.region}}',
				}),
				host: createVariable({
					name: 'host',
					type: 'QUERY',
					order: 2,
					queryValue: 'SELECT host FROM table WHERE cluster={{.cluster}}',
				}),
			};

			const result = computeDerivedValues(variables);

			const { dependencyData: depData } = result;
			expect(depData).not.toBeNull();
			expect(depData?.transitiveDescendants).toBeDefined();
			// region's transitive descendants should include cluster and host
			expect(depData?.transitiveDescendants['region']).toEqual(
				expect.arrayContaining(['cluster', 'host']),
			);
		});

		it('should handle a single variable', () => {
			const variables: IDashboardVariables = {
				solo: createVariable({
					name: 'solo',
					type: 'QUERY',
					order: 0,
				}),
			};

			const result = computeDerivedValues(variables);

			expect(result.sortedVariablesArray).toHaveLength(1);
			expect(result.variableTypes).toEqual({ solo: 'QUERY' });
			expect(result.dynamicVariableOrder).toEqual([]);
			expect(result.dependencyData).not.toBeNull();
			expect(result.dependencyData?.order).toEqual(['solo']);
		});

		it('should handle only non-QUERY variables', () => {
			const variables: IDashboardVariables = {
				custom1: createVariable({
					name: 'custom1',
					type: 'CUSTOM',
					order: 0,
				}),
				text1: createVariable({
					name: 'text1',
					type: 'TEXTBOX',
					order: 1,
				}),
				dyn1: createVariable({
					name: 'dyn1',
					type: 'DYNAMIC',
					order: 2,
				}),
			};

			const result = computeDerivedValues(variables);

			expect(result.sortedVariablesArray).toHaveLength(3);
			// No QUERY variables, so dependency order should be empty
			expect(result.dependencyData?.order).toEqual([]);
			expect(result.dynamicVariableOrder).toEqual(['dyn1']);
		});
	});
});
