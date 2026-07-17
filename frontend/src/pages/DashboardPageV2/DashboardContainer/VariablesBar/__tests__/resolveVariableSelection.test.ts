import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import {
	configuredDefaultValue,
	reconcileWithOptions,
	resolveDefaultSelection,
} from '../utils/resolveVariableSelection';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

describe('resolveDefaultSelection', () => {
	it('TEXT: uses defaultValue, then textValue, else empty string', () => {
		expect(
			resolveDefaultSelection(model({ type: 'TEXT', defaultValue: 'd' })),
		).toStrictEqual({ value: 'd', allSelected: false });
		expect(
			resolveDefaultSelection(model({ type: 'TEXT', textValue: 't' })),
		).toStrictEqual({ value: 't', allSelected: false });
		expect(resolveDefaultSelection(model({ type: 'TEXT' }))).toStrictEqual({
			value: '',
			allSelected: false,
		});
	});

	it('list: ALL when allowAll (multi + showAllOption) and no default', () => {
		expect(
			resolveDefaultSelection(
				model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
			),
		).toStrictEqual({ value: null, allSelected: true });
	});

	it('list: ALL sentinel default → ALL', () => {
		expect(
			resolveDefaultSelection(
				model({ type: 'CUSTOM', multiSelect: true, defaultValue: '__ALL__' }),
			),
		).toStrictEqual({ value: null, allSelected: true });
	});

	it('list: configured default wins over ALL default', () => {
		expect(
			resolveDefaultSelection(
				model({
					type: 'QUERY',
					multiSelect: true,
					showAllOption: true,
					defaultValue: 'x',
				}),
			),
		).toStrictEqual({ value: ['x'], allSelected: false });
	});

	it('list: no default and no allowAll → empty placeholder (filled after fetch)', () => {
		expect(resolveDefaultSelection(model({ type: 'QUERY' }))).toStrictEqual({
			value: '',
			allSelected: false,
		});
		expect(
			resolveDefaultSelection(model({ type: 'QUERY', multiSelect: true })),
		).toStrictEqual({ value: [], allSelected: false });
	});
});

describe('reconcileWithOptions', () => {
	it('leaves a valid single selection untouched (local-first)', () => {
		expect(
			reconcileWithOptions(
				model({ type: 'QUERY' }),
				{ value: 'b', allSelected: false },
				['a', 'b'],
			),
		).toBeNull();
	});

	it('materializes query ALL to the full option array', () => {
		expect(
			reconcileWithOptions(
				model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
				{ value: null, allSelected: true },
				['a', 'b'],
			),
		).toStrictEqual({ value: ['a', 'b'], allSelected: true });
	});

	it('does not materialize dynamic ALL (sends __all__)', () => {
		expect(
			reconcileWithOptions(
				model({ type: 'DYNAMIC', multiSelect: true, showAllOption: true }),
				{ value: null, allSelected: true },
				['a', 'b'],
			),
		).toBeNull();
	});

	it('keeps the still-valid subset when options re-scope', () => {
		expect(
			reconcileWithOptions(
				model({ type: 'QUERY', multiSelect: true }),
				{ value: ['a', 'b', 'c'], allSelected: false },
				['a', 'b', 'd'],
			),
		).toStrictEqual({ value: ['a', 'b'], allSelected: false });
	});

	it('falls back to the configured default (else first) when invalid', () => {
		expect(
			reconcileWithOptions(
				model({ type: 'QUERY', defaultValue: 'b' }),
				{ value: '', allSelected: false },
				['a', 'b', 'c'],
			),
		).toStrictEqual({ value: 'b', allSelected: false });
		expect(
			reconcileWithOptions(
				model({ type: 'QUERY' }),
				{ value: '', allSelected: false },
				['a', 'b'],
			),
		).toStrictEqual({ value: 'a', allSelected: false });
	});

	it('does nothing while options are empty', () => {
		expect(
			reconcileWithOptions(
				model({ type: 'QUERY' }),
				{ value: '', allSelected: false },
				[],
			),
		).toBeNull();
	});
});

describe('configuredDefaultValue', () => {
	it('TEXT: textValue fallback; list: defaultValue only (no ALL synthesis)', () => {
		expect(configuredDefaultValue(model({ type: 'TEXT', textValue: 't' }))).toBe(
			't',
		);
		expect(
			configuredDefaultValue(model({ type: 'QUERY', defaultValue: 'x' })),
		).toBe('x');
		// ALL-by-default list variable is not expanded here (options unknown).
		expect(
			configuredDefaultValue(
				model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
			),
		).toBeUndefined();
	});
});
