import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { AllTheProviders, renderHook } from 'tests/test-utils';

import { CHARTS_ONLY } from '../../../../controls/presets';
import type { DashboardControlsInput } from '../../../../controls/types';
import { useDashboardStore } from '../../../../store/useDashboardStore';
import { usePanelInteractions } from '../usePanelInteractions';

function dragSelect(controls?: DashboardControlsInput): void {
	useDashboardStore
		.getState()
		.setEditContext({ dashboardId: 'd1', refetch: jest.fn(), controls });
	const { result } = renderHook(() => usePanelInteractions(), {
		wrapper: AllTheProviders,
	});
	result.current.onDragSelect(1_000, 2_000);
}

describe('usePanelInteractions drag-to-zoom', () => {
	afterEach(() => {
		useDashboardStore
			.getState()
			.setEditContext({ dashboardId: '', refetch: jest.fn() });
	});

	it('writes the dragged range to the URL', () => {
		dragSelect();

		expect(safeNavigateMock).toHaveBeenCalledWith(
			expect.stringContaining('startTime=1000&endTime=2000'),
		);
	});

	it('does nothing when the host turns zoom off', () => {
		dragSelect({ panelActions: { zoom: false } });

		expect(safeNavigateMock).not.toHaveBeenCalled();
	});

	it('still zooms when the host hides the toolbar but leaves zoom on', () => {
		dragSelect({ toolbar: false });

		expect(safeNavigateMock).toHaveBeenCalled();
	});

	it('still zooms on a charts-only mount', () => {
		dragSelect(CHARTS_ONLY);

		expect(safeNavigateMock).toHaveBeenCalled();
	});
});
