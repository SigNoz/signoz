import { renderHook } from '@testing-library/react';
import {
	getGetDashboardV2QueryKey,
	usePatchDashboardV2,
} from 'api/generated/services/dashboard';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { usePanelEditorSave } from '../usePanelEditorSave';

const mockInvalidateQueries = jest.fn();
jest.mock('react-query', () => ({
	useQueryClient: (): { invalidateQueries: jest.Mock } => ({
		invalidateQueries: mockInvalidateQueries,
	}),
}));

jest.mock('api/generated/services/dashboard', () => ({
	usePatchDashboardV2: jest.fn(),
	getGetDashboardV2QueryKey: jest.fn(() => ['/api/v2/dashboards/dash-1']),
}));

const mockUsePatch = usePatchDashboardV2 as unknown as jest.Mock;
const mockGetQueryKey = getGetDashboardV2QueryKey as unknown as jest.Mock;

describe('usePanelEditorSave', () => {
	const mutateAsync = jest.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		jest.clearAllMocks();
		mockUsePatch.mockReturnValue({
			mutateAsync,
			isLoading: false,
			error: null,
		});
	});

	it('emits an add patch replacing the whole panel spec and invalidates the dashboard query', async () => {
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

		expect(mutateAsync).toHaveBeenCalledWith({
			pathParams: { id: 'dash-1' },
			data: [
				{
					op: 'add',
					path: '/spec/panels/panel-9/spec',
					value: spec,
				},
			],
		});
		expect(mockGetQueryKey).toHaveBeenCalledWith({ id: 'dash-1' });
		expect(mockInvalidateQueries).toHaveBeenCalledWith([
			'/api/v2/dashboards/dash-1',
		]);
	});

	it('surfaces the mutation loading state as isSaving', () => {
		mockUsePatch.mockReturnValue({
			mutateAsync,
			isLoading: true,
			error: null,
		});

		const { result } = renderHook(() =>
			usePanelEditorSave({ dashboardId: 'dash-1', panelId: 'panel-9' }),
		);

		expect(result.current.isSaving).toBe(true);
	});
});
