import { act, renderHook } from '@testing-library/react';

import {
	DYNAMIC_SIGNALS,
	emptyVariableFormModel,
	VARIABLE_SORT,
	type VariableFormModel,
} from '../variableFormModel';
import { useVariableForm } from './useVariableForm';

// Mock the store (its full slice graph is huge to transform and irrelevant here;
// the hook only reads dashboardId + variableValues for the Test-Run payload).
jest.mock('../../../store/useDashboardStore', () => ({
	useDashboardStore: (selector: (state: unknown) => unknown): unknown =>
		selector({ dashboardId: undefined, variableValues: {} }),
}));

function initial(overrides?: Partial<VariableFormModel>): VariableFormModel {
	return {
		...emptyVariableFormModel(),
		type: 'QUERY',
		name: 'svc',
		defaultValue: 'foo',
		...overrides,
	};
}

const args = (
	init: VariableFormModel,
): Parameters<typeof useVariableForm>[0] => ({
	initial: init,
	siblings: [],
	isNew: false,
	onSave: jest.fn(),
});

describe('useVariableForm default reset — QUERY (on Test Run)', () => {
	it('keeps the default when only the sort order changes', () => {
		const { result } = renderHook(() => useVariableForm(args(initial())));

		act(() => result.current.setRawPreview(['foo', 'bar']));
		expect(result.current.defaultValue).toBe('foo');

		// order-only change doesn't touch the preview values, so it must not reset
		act(() => result.current.set({ sort: VARIABLE_SORT.DESC }));
		expect(result.current.defaultValue).toBe('foo');
	});

	it('resets the default when a Test Run returns values that no longer contain it', () => {
		const { result } = renderHook(() => useVariableForm(args(initial())));

		act(() => result.current.setRawPreview(['foo', 'bar']));
		expect(result.current.defaultValue).toBe('foo');

		act(() => result.current.setRawPreview(['bar', 'baz']));
		expect(result.current.defaultValue).toBe('');
	});

	it('keeps the default when a Test Run still contains it', () => {
		const { result } = renderHook(() => useVariableForm(args(initial())));

		act(() => result.current.setRawPreview(['foo', 'bar']));
		act(() => result.current.setRawPreview(['foo', 'baz', 'qux']));
		expect(result.current.defaultValue).toBe('foo');
	});

	it('keeps the default when a re-run yields the same values (no actual change)', () => {
		const { result } = renderHook(() =>
			useVariableForm(args(initial({ defaultValue: 'bar' }))),
		);

		act(() => result.current.setRawPreview(['foo', 'bar']));
		// same set again — re-running an unchanged query must not disturb the default
		act(() => result.current.setRawPreview(['foo', 'bar']));
		expect(result.current.defaultValue).toBe('bar');
	});
});

describe('useVariableForm default reset — DYNAMIC (on attribute/signal change)', () => {
	const dynamic = (overrides?: Partial<VariableFormModel>): VariableFormModel =>
		initial({
			type: 'DYNAMIC',
			dynamicAttribute: 'service.name',
			dynamicSignal: DYNAMIC_SIGNALS[1],
			...overrides,
		});

	it('does not reset on the passive edit-open auto-fetch', () => {
		// The auto-fetch populates the preview without going through onDynamicChange,
		// so opening an existing variable must never clear its saved default.
		const { result } = renderHook(() =>
			useVariableForm(args(dynamic({ defaultValue: 'zzz' }))),
		);

		act(() => result.current.setRawPreview(['foo', 'bar']));
		expect(result.current.defaultValue).toBe('zzz');
	});

	it('resets when the attribute changes', () => {
		const { result } = renderHook(() => useVariableForm(args(dynamic())));

		act(() => result.current.onDynamicChange({ dynamicAttribute: 'host.name' }));
		expect(result.current.defaultValue).toBe('');
	});

	it('resets when the signal changes', () => {
		const { result } = renderHook(() => useVariableForm(args(dynamic())));

		act(() =>
			result.current.onDynamicChange({ dynamicSignal: DYNAMIC_SIGNALS[2] }),
		);
		expect(result.current.defaultValue).toBe('');
	});

	it('keeps the default when the attribute is set to the same value', () => {
		const { result } = renderHook(() => useVariableForm(args(dynamic())));

		act(() =>
			result.current.onDynamicChange({ dynamicAttribute: 'service.name' }),
		);
		expect(result.current.defaultValue).toBe('foo');
	});
});

describe('useVariableForm default reset — CUSTOM (on options edit)', () => {
	const custom = (overrides?: Partial<VariableFormModel>): VariableFormModel =>
		initial({ type: 'CUSTOM', ...overrides });

	it('resets when the edited options no longer contain the default', () => {
		const { result } = renderHook(() => useVariableForm(args(custom())));

		act(() => result.current.onCustomChange('bar, baz'));
		expect(result.current.defaultValue).toBe('');
	});

	it('keeps the default when the edited options still contain it', () => {
		const { result } = renderHook(() => useVariableForm(args(custom())));

		act(() => result.current.onCustomChange('foo, bar, baz'));
		expect(result.current.defaultValue).toBe('foo');
	});
});
