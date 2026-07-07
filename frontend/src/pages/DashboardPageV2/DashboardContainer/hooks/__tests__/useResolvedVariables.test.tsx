import { renderHook } from '@testing-library/react';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';

import { selectResolvedVariables } from '../../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useResolvedVariables } from '../useResolvedVariables';

// A text variable is the simplest envelope (no list plugin); the builder's full
// type/value matrix is covered in buildVariablesPayload.test.ts. The envelope is
// cast at the boundary — its kind discriminant is the literal 'TextVariable'.
function textVariable(name: string, value: string): DashboardtypesVariableDTO {
	return {
		kind: 'TextVariable',
		spec: { name, value, display: { name } },
	} as unknown as DashboardtypesVariableDTO;
}

function dashboard(
	id: string,
	variables: DashboardtypesVariableDTO[],
): DashboardtypesGettableDashboardV2DTO {
	return {
		id,
		spec: { variables },
	} as unknown as DashboardtypesGettableDashboardV2DTO;
}

describe('useResolvedVariables', () => {
	afterEach(() => {
		useDashboardStore.setState({ variableValues: {}, resolvedVariables: {} });
	});

	it('publishes the resolved V5 payload for the dashboard to the store', () => {
		renderHook(() =>
			useResolvedVariables(dashboard('d1', [textVariable('env', 'prod')])),
		);

		expect(
			selectResolvedVariables('d1')(useDashboardStore.getState()),
		).toStrictEqual({ env: { type: 'text', value: 'prod' } });
	});

	it('reflects the runtime selection over the configured default', () => {
		useDashboardStore
			.getState()
			.setVariableValues('d2', { env: { value: 'staging', allSelected: false } });

		renderHook(() =>
			useResolvedVariables(dashboard('d2', [textVariable('env', 'prod')])),
		);

		expect(
			selectResolvedVariables('d2')(useDashboardStore.getState()),
		).toStrictEqual({ env: { type: 'text', value: 'staging' } });
	});

	it('publishes an empty payload when the dashboard has no variables', () => {
		renderHook(() => useResolvedVariables(dashboard('d3', [])));

		expect(
			selectResolvedVariables('d3')(useDashboardStore.getState()),
		).toStrictEqual({});
	});
});
