import { renderHook } from '@testing-library/react';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import { VariableCycleReason } from '../../store/slices/variableFetchSlice';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { VariableSelection } from '../selectionTypes';
import { useAutoSelect } from '../hooks/useAutoSelect';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

function run(
	variable: VariableFormModel,
	options: string[],
	selection: VariableSelection,
	cycleReason?: VariableCycleReason,
): VariableSelection | undefined {
	useDashboardStore.setState({
		variableCycleReasons: cycleReason ? { [variable.name]: cycleReason } : {},
	});
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

	it('selects ALL for an ALL-enabled multi-select with nothing selected', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
			['a', 'b'],
			{ value: [], allSelected: false },
		);
		expect(next).toStrictEqual({ value: ['a', 'b'], allSelected: true });
	});

	// Re-scoped options only — a time-range refetch must NOT re-default; see below.
	it('re-scoped: falls back to ALL, not the first option, when every selected value is gone', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true, showAllOption: true }),
			['x', 'y'],
			{ value: ['a', 'b'], allSelected: false },
			VariableCycleReason.ValueCascade,
		);
		expect(next).toStrictEqual({ value: ['x', 'y'], allSelected: true });
	});

	it('selects the ALL sentinel for an empty ALL-enabled dynamic multi-select', () => {
		const next = run(
			model({ type: 'DYNAMIC', multiSelect: true, showAllOption: true }),
			['a', 'b'],
			{ value: [], allSelected: false },
		);
		expect(next).toStrictEqual({ value: null, allSelected: true });
	});

	it('still honours a configured default over ALL', () => {
		const next = run(
			model({
				type: 'QUERY',
				multiSelect: true,
				showAllOption: true,
				defaultValue: 'b',
			}),
			['a', 'b'],
			{ value: [], allSelected: false },
		);
		expect(next).toStrictEqual({ value: ['b'], allSelected: false });
	});

	it('re-scoped: keeps the still-valid subset of a multi-select', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true }),
			['a', 'b', 'd'],
			{ value: ['a', 'b', 'c'], allSelected: false },
			VariableCycleReason.ValueCascade,
		);
		expect(next).toStrictEqual({ value: ['a', 'b'], allSelected: false });
	});

	it('re-scoped: re-defaults a multi-select when none of the selected values remain', () => {
		const next = run(
			model({ type: 'QUERY', multiSelect: true }),
			['x', 'y'],
			{ value: ['a', 'b'], allSelected: false },
			VariableCycleReason.ValueCascade,
		);
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

	describe('by cycle reason', () => {
		const service = model({
			name: 'service',
			type: 'DYNAMIC',
			multiSelect: true,
			showAllOption: true,
			dynamicAttribute: 'service.name',
		});
		const gone: VariableSelection = { value: ['frontend'], allSelected: false };

		it('keeps the selection when a full cycle refetched the options', () => {
			// The new window has no data for the selected service — no reason to widen to ALL.
			const next = run(
				service,
				['backend', 'cart'],
				gone,
				VariableCycleReason.FullCycle,
			);
			expect(next).toBeUndefined();
		});

		it('re-scopes the selection when a value cascade refetched the options', () => {
			const next = run(
				service,
				['backend', 'cart'],
				gone,
				VariableCycleReason.ValueCascade,
			);
			expect(next).toStrictEqual({ value: null, allSelected: true });
		});

		it('reconciles a variable with no cycle of its own (custom definition change)', () => {
			const next = run(
				model({ name: 'env', type: 'CUSTOM', multiSelect: true }),
				['staging', 'prod'],
				{ value: ['dev'], allSelected: false },
			);
			expect(next).toStrictEqual({ value: ['staging'], allSelected: false });
		});
	});
});
