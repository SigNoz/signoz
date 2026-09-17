import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { usePanelEditorSave } from '../usePanelEditorSave';

const mockPatchAsync = vi.fn().mockResolvedValue(undefined);
let mockIsPatching = false;
vi.mock('../../../hooks/useOptimisticPatch', () => ({
	useOptimisticPatch: (): {
		patchAsync: Mock;
		isPatching: boolean;
		error: Error | null;
	} => ({ patchAsync: mockPatchAsync, isPatching: mockIsPatching, error: null }),
}));

// The hook reads getQueryData only for the isNew branch; a stub client is enough here.
vi.mock('react-query', () => ({
	useQueryClient: (): { getQueryData: Mock } => ({
		getQueryData: vi.fn(),
	}),
}));

vi.mock('api/generated/services/dashboard', () => ({
	getGetDashboardV2QueryKey: vi.fn(() => ['/api/v2/dashboards/dash-1']),
}));

vi.mock('uuid', () => ({ v4: (): string => 'minted-panel-id' }));

describe('usePanelEditorSave', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

		const savedPanelId = await result.current.save(spec);

		expect(mockPatchAsync).toHaveBeenCalledWith([
			{
				op: 'add',
				path: '/spec/panels/panel-9/spec',
				value: spec,
			},
		]);
		// Editing resolves with the panel's own id.
		expect(savedPanelId).toBe('panel-9');
	});

	// Skipped: vi.mock('uuid') is bypassed by the pre-bundled uuid chunk in browser mode (needs optimizeDeps.exclude); passes under jsdom.
	it.skip('mints and resolves with a fresh id when creating a new panel', async () => {
		const { result } = renderHook(() =>
			usePanelEditorSave({ dashboardId: 'dash-1', panelId: 'new', isNew: true }),
		);

		const spec = {
			display: { name: 'New panel' },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [],
		} as unknown as DashboardtypesPanelSpecDTO;

		const savedPanelId = await result.current.save(spec);

		expect(savedPanelId).toBe('minted-panel-id');
		expect(mockPatchAsync).toHaveBeenCalled();
	});

	it('surfaces the patch in-flight state as isSaving', () => {
		mockIsPatching = true;

		const { result } = renderHook(() =>
			usePanelEditorSave({ dashboardId: 'dash-1', panelId: 'panel-9' }),
		);

		expect(result.current.isSaving).toBe(true);
	});
});
