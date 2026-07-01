import { renderHook } from '@testing-library/react';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';

import { useCreateAlertFromPanel } from '../useCreateAlertFromPanel';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

// The V5→V1 query→URL translation is covered by buildCreateAlertUrl's own tests;
// stub it so this asserts only the hook's side effects (analytics + navigation).
jest.mock('../../utils/buildCreateAlertUrl', () => ({
	buildCreateAlertUrl: (): string => '/alerts/new?composite=1',
}));

const mockLogEvent = logEvent as jest.Mock;

const panel = {
	kind: 'Panel',
	spec: {
		display: { name: 'CPU' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
		queries: [],
	},
} as unknown as DashboardtypesPanelDTO;

describe('useCreateAlertFromPanel', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useDashboardStore.setState({ dashboardId: 'dash-1' });
	});

	it('opens the seeded alert builder in a new tab', () => {
		const { result } = renderHook(() => useCreateAlertFromPanel());

		result.current(panel, 'panel-1');

		expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts/new?composite=1', {
			newTab: true,
		});
	});

	it('logs the create-alert action with panel and dashboard context (V1 parity)', () => {
		const { result } = renderHook(() => useCreateAlertFromPanel());

		result.current(panel, 'panel-1');

		expect(mockLogEvent).toHaveBeenCalledWith(
			'Dashboard Detail: Panel action',
			expect.objectContaining({
				action: 'createAlerts',
				panelType: PANEL_TYPES.TIME_SERIES,
				dashboardId: 'dash-1',
				widgetId: 'panel-1',
			}),
		);
	});
});
