import { renderHook } from '@testing-library/react';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { Querybuildertypesv5VariableTypeDTO } from 'api/generated/services/sigNoz.schemas';
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

const mockToastError = jest.fn();
jest.mock('@signozhq/ui/sonner', () => ({
	toast: { error: (...args: unknown[]): void => mockToastError(...args) },
}));

jest.mock('react-redux', () => ({
	useSelector: (selector: (state: unknown) => unknown): unknown =>
		selector({ globalTime: { minTime: 1_000_000, maxTime: 2_000_000 } }),
}));

const mockSubstituteVars = jest.fn();
jest.mock('api/generated/services/querier', () => ({
	useReplaceVariables: (): { mutate: jest.Mock } => ({
		mutate: mockSubstituteVars,
	}),
}));

// Stub the builders so this asserts only the hook's orchestration.
jest.mock('../../utils/buildCreateAlertUrl', () => ({
	buildCreateAlertUrl: (): string => '/alerts/new?composite=sync',
	buildAlertUrl: (): string => '/alerts/new?composite=substituted',
	readPanelUnit: (): string | undefined => undefined,
}));

// Keep the real exports (getPanelQueryType reads them); stub only the builder.
const mockBuildQueryRangeRequest = jest.fn((_args?: unknown) => ({
	request: 'payload',
}));
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest',
	() => ({
		...jest.requireActual(
			'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest',
		),
		buildQueryRangeRequest: (args: unknown): unknown =>
			mockBuildQueryRangeRequest(args),
	}),
);

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters',
	() => ({
		...jest.requireActual(
			'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters',
		),
		envelopesToQuery: (): unknown => ({ resolved: 'query' }),
	}),
);

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
		useDashboardStore.setState({ dashboardId: 'dash-1', resolvedVariables: {} });
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

	describe('with no variable selections', () => {
		it('seeds the alert synchronously without a substitute round-trip', () => {
			const { result } = renderHook(() => useCreateAlertFromPanel());

			result.current(panel, 'panel-1');

			expect(mockSubstituteVars).not.toHaveBeenCalled();
			expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts/new?composite=sync', {
				newTab: true,
			});
		});
	});

	describe('with variable selections', () => {
		beforeEach(() => {
			useDashboardStore.setState({
				dashboardId: 'dash-1',
				resolvedVariables: {
					'dash-1': {
						service: {
							type: Querybuildertypesv5VariableTypeDTO.query,
							value: 'checkout',
						},
					},
				},
			});
		});

		it('substitutes variables before seeding, then opens the resolved alert', () => {
			const { result } = renderHook(() => useCreateAlertFromPanel());

			result.current(panel, 'panel-1');

			// Round-trips the panel's queries + resolved variables.
			expect(mockBuildQueryRangeRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					queries: panel.spec.queries,
					panelType: PANEL_TYPES.TIME_SERIES,
					variables: { service: { type: 'query', value: 'checkout' } },
				}),
			);
			expect(mockSubstituteVars).toHaveBeenCalledWith(
				{ data: { request: 'payload' } },
				expect.objectContaining({
					onSuccess: expect.any(Function),
					onError: expect.any(Function),
				}),
			);
			// Nothing opens until the round-trip resolves.
			expect(mockSafeNavigate).not.toHaveBeenCalled();

			const { onSuccess } = mockSubstituteVars.mock.calls[0][1];
			onSuccess({ data: { compositeQuery: { queries: [{ type: 'builder' }] } } });

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				'/alerts/new?composite=substituted',
				{ newTab: true },
			);
		});

		it('notifies and does not navigate when substitution fails', () => {
			const { result } = renderHook(() => useCreateAlertFromPanel());

			result.current(panel, 'panel-1');

			const { onError } = mockSubstituteVars.mock.calls[0][1];
			onError();

			expect(mockToastError).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ description: expect.any(String) }),
			);
			expect(mockSafeNavigate).not.toHaveBeenCalled();
		});
	});
});
