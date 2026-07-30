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

jest.mock('react-redux', () => ({
	useSelector: (selector: (state: unknown) => unknown): unknown =>
		selector({
			globalTime: { minTime: 1, maxTime: 2, selectedTime: '5m' },
		}),
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
