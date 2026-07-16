import { renderHook } from '@testing-library/react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useSeedVariableSelection } from '../hooks/useSeedVariableSelection';

const mockSetUrlValues = jest.fn();
let mockUrlValues: Record<string, unknown> | null = null;

jest.mock('nuqs', () => ({
	parseAsJson: (): unknown => ({ withOptions: (): unknown => ({}) }),
	useQueryState: (): unknown => [mockUrlValues, mockSetUrlValues],
}));

// The hook maps spec DTOs through dtoToFormModel; identity lets tests pass form
// models directly as `spec.variables`.
jest.mock('../../DashboardSettings/Variables/variableAdapters', () => ({
	dtoToFormModel: (dto: unknown): unknown => dto,
}));

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

function dashboard(
	id: string,
	variables: VariableFormModel[],
): DashboardtypesGettableDashboardV2DTO {
	return {
		id,
		spec: { variables },
	} as unknown as DashboardtypesGettableDashboardV2DTO;
}

function seededValue(dashboardId: string, name: string): unknown {
	return useDashboardStore.getState().variableValues[dashboardId]?.[name];
}

describe('useSeedVariableSelection', () => {
	afterEach(() => {
		mockUrlValues = null;
		mockSetUrlValues.mockClear();
		useDashboardStore.setState({
			variableValues: {},
			variableFetchStates: {},
			variableFetchContext: null,
		});
	});

	it('seeds from the URL over the stored value and the default', () => {
		mockUrlValues = { env: 'from-url' };
		useDashboardStore
			.getState()
			.setVariableValues('d1', { env: { value: 'stored', allSelected: false } });
		const dash = dashboard('d1', [
			model({ name: 'env', type: 'TEXT', defaultValue: 'default' }),
		]);

		renderHook(() => useSeedVariableSelection(dash));

		expect(seededValue('d1', 'env')).toStrictEqual({
			value: 'from-url',
			allSelected: false,
		});
	});

	it('falls back to the stored value when the URL has no entry', () => {
		useDashboardStore
			.getState()
			.setVariableValues('d1', { env: { value: 'stored', allSelected: false } });
		const dash = dashboard('d1', [
			model({ name: 'env', type: 'TEXT', defaultValue: 'default' }),
		]);

		renderHook(() => useSeedVariableSelection(dash));

		expect(seededValue('d1', 'env')).toStrictEqual({
			value: 'stored',
			allSelected: false,
		});
	});

	it('falls back to the default when neither URL nor store has a value', () => {
		const dash = dashboard('d1', [
			model({ name: 'env', type: 'TEXT', defaultValue: 'default' }),
		]);

		renderHook(() => useSeedVariableSelection(dash));

		expect(seededValue('d1', 'env')).toStrictEqual({
			value: 'default',
			allSelected: false,
		});
	});

	it('initializes the fetch context with idle states for every variable', () => {
		const dash = dashboard('d1', [
			model({ name: 'env', type: 'TEXT' }),
			model({ name: 'service', type: 'CUSTOM', customValue: 'a,b' }),
		]);

		renderHook(() => useSeedVariableSelection(dash));

		const state = useDashboardStore.getState();
		expect(state.variableFetchContext?.variableTypes).toStrictEqual({
			env: 'TEXT',
			service: 'CUSTOM',
		});
		expect(state.variableFetchStates).toStrictEqual({
			env: 'idle',
			service: 'idle',
		});
	});

	it('seeds from the URL then clears it (read-once share link)', () => {
		mockUrlValues = { env: 'prod', removed: 'stale' };
		const dash = dashboard('d1', [model({ name: 'env', type: 'TEXT' })]);

		renderHook(() => useSeedVariableSelection(dash));

		expect(seededValue('d1', 'env')).toStrictEqual({
			value: 'prod',
			allSelected: false,
		});
		expect(mockSetUrlValues).toHaveBeenCalledWith(null);
	});

	it('writes nothing while the dashboard is still loading', () => {
		renderHook(() => useSeedVariableSelection(undefined));

		const state = useDashboardStore.getState();
		expect(state.variableValues).toStrictEqual({});
		expect(state.variableFetchContext).toBeNull();
	});
});
