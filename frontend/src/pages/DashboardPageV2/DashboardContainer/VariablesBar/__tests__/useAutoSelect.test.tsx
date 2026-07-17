import { renderHook } from '@testing-library/react';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelection } from '../selectionTypes';
import { useAutoSelect } from '../hooks/useAutoSelect';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

function run(
	variable: VariableFormModel,
	options: string[],
	selection: VariableSelection,
): VariableSelection | undefined {
	const onAutoSelect = jest.fn();
	renderHook(() => useAutoSelect(variable, options, selection, onAutoSelect));
	return onAutoSelect.mock.calls[0]?.[0];
}

describe('useAutoSelect', () => {
	it('materializes a query ALL selection to the full option array', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
			['a', 'b', 'c'],
			{ value: null, allSelected: true },
		);
		expect(next).toStrictEqual({ value: ['a', 'b', 'c'], allSelected: true });
	});

	it('re-materializes ALL when the options grow', () => {
		const next = run(
			model({ type: 'CUSTOM', multiSelect: true, showAllOption: true }),
			['a', 'b', 'c', 'd'],
			{ value: ['a', 'b', 'c'], allSelected: true },
		);
		expect(next).toStrictEqual({
			value: ['a', 'b', 'c', 'd'],
			allSelected: true,
		});
	});

	it('leaves a query ALL selection untouched when already the full set', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
			['a', 'b'],
			{ value: ['a', 'b'], allSelected: true },
		);
		expect(next).toBeUndefined();
	});

	it('does NOT materialize a dynamic ALL selection (it sends __all__)', () => {
		const next = run(
			model({ type: 'DYNAMIC', multiSelect: true, showAllOption: true }),
			['a', 'b'],
			{ value: null, allSelected: true },
		);
		expect(next).toBeUndefined();
	});

	it('keeps the still-valid subset of a multi-select when options re-scope', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true }),
			['a', 'b', 'd'],
			{ value: ['a', 'b', 'c'], allSelected: false },
		);
		expect(next).toStrictEqual({ value: ['a', 'b'], allSelected: false });
	});

	it('re-defaults a multi-select when none of the selected values remain', () => {
		const next = run(model({ type: 'QUERY', multiSelect: true }), ['x', 'y'], {
			value: ['a', 'b'],
			allSelected: false,
		});
		expect(next).toStrictEqual({ value: ['x'], allSelected: false });
	});

	it('auto-selects the default (if present) for a single-select', () => {
		const next = run(
			model({ type: 'QUERY', defaultValue: 'b' }),
			['a', 'b', 'c'],
			{ value: '', allSelected: false },
		);
		expect(next).toStrictEqual({ value: 'b', allSelected: false });
	});

	it('auto-selects the first option when the default is not available', () => {
		const next = run(model({ type: 'QUERY', defaultValue: 'z' }), ['a', 'b'], {
			value: '',
			allSelected: false,
		});
		expect(next).toStrictEqual({ value: 'a', allSelected: false });
	});

	it('leaves a valid single selection untouched', () => {
		const next = run(model({ type: 'QUERY' }), ['a', 'b'], {
			value: 'b',
			allSelected: false,
		});
		expect(next).toBeUndefined();
	});

	it('does nothing while options are empty', () => {
		const next = run(model({ type: 'QUERY' }), [], {
			value: '',
			allSelected: false,
		});
		expect(next).toBeUndefined();
	});
});
