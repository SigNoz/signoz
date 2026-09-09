import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useVariableSelection } from '../hooks/useVariableSelection';

jest.mock('nuqs', () => ({
	parseAsJson: (): unknown => ({ withOptions: (): unknown => ({}) }),
	useQueryState: (): unknown => [null, jest.fn()],
}));

const mockGlobalTime = { minTime: 1, maxTime: 2, selectedTime: '5m' };

jest.mock('react-redux', () => ({
	useSelector: (selector: (state: unknown) => unknown): unknown =>
		selector({ globalTime: mockGlobalTime }),
}));

jest.mock('../../DashboardSettings/Variables/variableAdapters', () => ({
	dtoToFormModel: (dto: unknown): unknown => dto,
}));

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

// env → svc, so a cascade off `env` is observable as a cycle bump on `svc`.
const env = model({
	name: 'env',
	type: 'QUERY',
	multiSelect: true,
	queryValue: 'SELECT env',
});
const svc = model({
	name: 'svc',
	type: 'QUERY',
	queryValue: 'SELECT svc WHERE env = $env',
});

const dashboard = {
	id: 'd1',
	spec: { variables: [env, svc] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

function svcCycleId(): number {
	return useDashboardStore.getState().variableCycleIds.svc ?? 0;
}

describe('useVariableSelection — setSelection', () => {
	beforeEach(() => {
		useDashboardStore.setState({
			variableValues: {},
			variableFetchStates: {},
			variableLastUpdated: {},
			variableCycleIds: {},
			variableResolvedEmpty: {},
			variableFetchContext: null,
			lastFetchAllKey: null,
		});
	});

	it('does not re-cascade when the picked value is the one already held', () => {
		const { result } = renderHook(() => useVariableSelection(dashboard));

		act(() => {
			result.current.setSelection('env', {
				value: ['a', 'b'],
				allSelected: false,
			});
		});
		const afterFirstPick = svcCycleId();

		// Same values, then the same set in a different order: neither is a change, so
		// the dependent must not be re-fetched.
		act(() => {
			result.current.setSelection('env', {
				value: ['a', 'b'],
				allSelected: false,
			});
		});
		act(() => {
			result.current.setSelection('env', {
				value: ['b', 'a'],
				allSelected: false,
			});
		});

		expect(svcCycleId()).toBe(afterFirstPick);
	});

	it('ignores an auto-fill that the store already satisfies', async () => {
		const { result } = renderHook(() => useVariableSelection(dashboard));
		act(() => {
			result.current.setSelection('env', { value: ['a'], allSelected: false });
		});
		const before = svcCycleId();

		// What a selector's first-render reconcile produces before the seed commits: a
		// value the store then resolves to on its own.
		await act(async () => {
			result.current.autoSelect('env', { value: ['a'], allSelected: false });
			await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
		});

		expect(svcCycleId()).toBe(before);
	});

	it('still applies an auto-fill that changes the value', async () => {
		const { result } = renderHook(() => useVariableSelection(dashboard));
		act(() => {
			result.current.setSelection('env', { value: ['a'], allSelected: false });
		});
		const before = svcCycleId();

		await act(async () => {
			result.current.autoSelect('env', { value: ['a', 'b'], allSelected: false });
			await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
		});

		expect(useDashboardStore.getState().variableValues.d1?.env).toStrictEqual({
			value: ['a', 'b'],
			allSelected: false,
		});
		expect(svcCycleId()).toBe(before + 1);
	});

	it('still cascades a genuine change', () => {
		const { result } = renderHook(() => useVariableSelection(dashboard));

		act(() => {
			result.current.setSelection('env', { value: ['a'], allSelected: false });
		});
		const before = svcCycleId();

		act(() => {
			result.current.setSelection('env', {
				value: ['a', 'c'],
				allSelected: false,
			});
		});

		expect(useDashboardStore.getState().variableValues.d1?.env).toStrictEqual({
			value: ['a', 'c'],
			allSelected: false,
		});
		expect(svcCycleId()).toBe(before + 1);
	});
});

describe('useVariableSelection — what a time-range change enqueues', () => {
	// Longer than FETCH_CYCLE_DEBOUNCE_MS, which the hook keeps private.
	const PAST_DEBOUNCE = 400;

	function reasons(): Record<string, string> {
		return useDashboardStore.getState().variableCycleReasons;
	}

	beforeEach(() => {
		jest.useFakeTimers();
		mockGlobalTime.selectedTime = '5m';
		useDashboardStore.setState({
			variableValues: {},
			variableFetchStates: {},
			variableLastUpdated: {},
			variableCycleIds: {},
			variableCycleReasons: {},
			variableResolvedEmpty: {},
			variableFetchContext: null,
			lastFetchAllKey: null,
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	// The tag is what stops the reconcile re-defaulting a user's selection.
	it('tags every variable as a full cycle, overriding an earlier cascade tag', () => {
		const { result, rerender } = renderHook(() =>
			useVariableSelection(dashboard),
		);

		act(() => {
			jest.advanceTimersByTime(PAST_DEBOUNCE);
		});
		expect(reasons()).toStrictEqual({ env: 'full-cycle', svc: 'full-cycle' });

		// A value change re-scopes the dependent's options: it may drop what no longer applies.
		act(() => {
			result.current.setSelection('env', { value: ['prod'], allSelected: false });
		});
		expect(reasons().svc).toBe('value-cascade');

		mockGlobalTime.selectedTime = '30m';
		rerender();
		act(() => {
			jest.advanceTimersByTime(PAST_DEBOUNCE);
		});

		expect(reasons()).toStrictEqual({ env: 'full-cycle', svc: 'full-cycle' });
	});
});
