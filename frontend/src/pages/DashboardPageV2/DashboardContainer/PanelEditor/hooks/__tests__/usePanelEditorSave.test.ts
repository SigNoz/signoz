import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { usePanelEditorSave } from '../usePanelEditorSave';

const mockPatchAsync = jest.fn().mockResolvedValue(undefined);
let mockIsPatching = false;
jest.mock('../../../hooks/useOptimisticPatch', () => ({
	useOptimisticPatch: (): {
		patchAsync: jest.Mock;
		isPatching: boolean;
		error: Error | null;
	} => ({ patchAsync: mockPatchAsync, isPatching: mockIsPatching, error: null }),
}));

// The hook reads getQueryData only for the isNew branch; a stub client is enough here.
jest.mock('react-query', () => ({
	useQueryClient: (): { getQueryData: jest.Mock } => ({
		getQueryData: jest.fn(),
	}),
}));

jest.mock('api/generated/services/dashboard', () => ({
	getGetDashboardV2QueryKey: jest.fn(() => ['/api/v2/dashboards/dash-1']),
}));

describe('usePanelEditorSave', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockIsPatching = false;
	});

	it('optimistically patches an add replacing the whole panel spec', async () => {
		const { result } = renderHook(() =>
			usePanelEditorSave({ dashboardId: 'dash-1', panelId: 'panel-9' }),
		);

		const spec = {
			display: { name: 'New title', description: 'desc' },
			plugin: {
				kind: 'signoz/TimeSeriesPanel',
				spec: { formatting: { unit: 'bytes' } },
			},
			queries: [],
		} as unknown as DashboardtypesPanelSpecDTO;

		await result.current.save(spec);

		expect(mockPatchAsync).toHaveBeenCalledWith([
			{
				op: 'add',
				path: '/spec/panels/panel-9/spec',
				value: spec,
			},
		]);
	});

	it('surfaces the patch in-flight state as isSaving', () => {
		mockIsPatching = true;

		const { result } = renderHook(() =>
			usePanelEditorSave({ dashboardId: 'dash-1', panelId: 'panel-9' }),
		);

		expect(result.current.isSaving).toBe(true);
	});
});
