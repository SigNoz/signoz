import {
	emptyVariableFormModel,
	type VariableFormModel,
	type VariableType,
} from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from '../../VariablesBar/selectionTypes';
import { buildVariablesPayload } from '../buildVariablesPayload';

function variable(
	name: string,
	type: VariableType,
	overrides: Partial<VariableFormModel> = {},
): VariableFormModel {
	return { ...emptyVariableFormModel(), name, type, ...overrides };
}

describe('buildVariablesPayload', () => {
	it('returns an empty map when there are no definitions', () => {
		expect(buildVariablesPayload([], {})).toStrictEqual({});
	});

	it('maps each UI variable type to its V5 wire type', () => {
		const definitions = [
			variable('q', 'QUERY'),
			variable('c', 'CUSTOM'),
			variable('t', 'TEXT'),
			variable('d', 'DYNAMIC'),
		];
		const selection: VariableSelectionMap = {
			q: { value: 'a', allSelected: false },
			c: { value: 'b', allSelected: false },
			t: { value: 'c', allSelected: false },
			d: { value: 'e', allSelected: false },
		};
		expect(buildVariablesPayload(definitions, selection)).toStrictEqual({
			q: { type: 'query', value: 'a' },
			c: { type: 'custom', value: 'b' },
			t: { type: 'text', value: 'c' },
			d: { type: 'dynamic', value: 'e' },
		});
	});

	it('passes a multi-select array value through verbatim', () => {
		const definitions = [variable('svc', 'QUERY', { multiSelect: true })];
		const selection: VariableSelectionMap = {
			svc: { value: ['a', 'b'], allSelected: false },
		};
		expect(buildVariablesPayload(definitions, selection)).toStrictEqual({
			svc: { type: 'query', value: ['a', 'b'] },
		});
	});

	it('collapses a multi-select dynamic ALL selection to the __all__ sentinel', () => {
		const definitions = [variable('pod', 'DYNAMIC', { multiSelect: true })];
		const selection: VariableSelectionMap = {
			pod: { value: null, allSelected: true },
		};
		expect(buildVariablesPayload(definitions, selection)).toStrictEqual({
			pod: { type: 'dynamic', value: '__all__' },
		});
	});

	it('does NOT collapse a query ALL selection — it sends the full value array', () => {
		const definitions = [variable('svc', 'QUERY', { multiSelect: true })];
		const selection: VariableSelectionMap = {
			svc: { value: ['a', 'b'], allSelected: true },
		};
		expect(buildVariablesPayload(definitions, selection)).toStrictEqual({
			svc: { type: 'query', value: ['a', 'b'] },
		});
	});

	it('falls back to a text variable configured value when unselected', () => {
		const definitions = [variable('env', 'TEXT', { textValue: 'prod' })];
		expect(buildVariablesPayload(definitions, {})).toStrictEqual({
			env: { type: 'text', value: 'prod' },
		});
	});

	it('falls back to a list variable configured default when unselected', () => {
		const definitions = [
			variable('region', 'QUERY', {
				defaultValue: { value: 'us-east' },
			} as unknown as Partial<VariableFormModel>),
		];
		expect(buildVariablesPayload(definitions, {})).toStrictEqual({
			region: { type: 'query', value: 'us-east' },
		});
	});

	it('omits a variable with no selection and no default', () => {
		const definitions = [variable('q', 'QUERY')];
		expect(buildVariablesPayload(definitions, {})).toStrictEqual({});
	});

	it('omits an unnamed variable', () => {
		const definitions = [variable('', 'QUERY')];
		const selection: VariableSelectionMap = {
			'': { value: 'x', allSelected: false },
		};
		expect(buildVariablesPayload(definitions, selection)).toStrictEqual({});
	});
});
