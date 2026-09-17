import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { Querybuildertypesv5VariableTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

import { useCreateAlertFromPanel } from '../useCreateAlertFromPanel';

vi.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEventMeta',
	() => ({
		useDashboardEventMeta: (): {
			dashboardId: string;
			dashboardName: string;
		} => ({
			dashboardId: 'dash-1',
			dashboardName: 'Infra overview',
		}),
	}),
);

const { mockSafeNavigate } = vi.hoisted(() => ({ mockSafeNavigate: vi.fn() }));
vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock('@signozhq/ui/sonner', () => ({
	toast: { error: (...args: unknown[]): void => mockToastError(...args) },
}));

vi.mock('react-redux', async () => ({
	...(await vi.importActual('react-redux')),
	useSelector: (selector: (state: unknown) => unknown): unknown =>
		selector({ globalTime: { minTime: 1_000_000, maxTime: 2_000_000 } }),
}));

const { mockSubstituteVars } = vi.hoisted(() => ({
	mockSubstituteVars: vi.fn(),
}));
vi.mock('api/generated/services/querier', () => ({
	useReplaceVariables: (): { mutate: Mock } => ({
		mutate: mockSubstituteVars,
	}),
}));

// Stub the builders so this asserts only the hook's orchestration.
const { mockBuildAlertUrl } = vi.hoisted(() => ({
	mockBuildAlertUrl: vi.fn(
		(..._args: unknown[]) => '/alerts/new?composite=substituted',
	),
}));
vi.mock('../../utils/buildCreateAlertUrl', () => ({
	buildCreateAlertUrl: (): string => '/alerts/new?composite=sync',
	buildAlertUrl: (...args: unknown[]): string => mockBuildAlertUrl(...args),
	readPanelUnit: (): string | undefined => undefined,
}));

// Prefill derivation has its own coverage; return a sentinel so the hook test can
// assert it is threaded into the resolved-alert URL.
const { mockPrefill } = vi.hoisted(() => ({
	mockPrefill: { matchType: 'in_total' },
}));
vi.mock('../../utils/deriveAlertPrefill', () => ({
	deriveAlertPrefill: (): unknown => mockPrefill,
}));

// Keep the real exports (getPanelQueryType reads them); stub only the builder.
const { mockBuildQueryRangeRequest } = vi.hoisted(() => ({
	mockBuildQueryRangeRequest: vi.fn((_args?: unknown) => ({
		request: 'payload',
	})),
}));
vi.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/buildQueryRangeRequest',
	async () => ({
		...(await vi.importActual(
			'pages/DashboardPage/DashboardContainer/queryV5/buildQueryRangeRequest',
		)),
		buildQueryRangeRequest: (args: unknown): unknown =>
			mockBuildQueryRangeRequest(args),
	}),
);

vi.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/persesQueryAdapters',
	async () => ({
		...(await vi.importActual(
			'pages/DashboardPage/DashboardContainer/queryV5/persesQueryAdapters',
		)),
		envelopesToQuery: (): unknown => ({ resolved: 'query' }),
	}),
);

const mockLogEvent = logEvent as Mock;

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
		vi.clearAllMocks();
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
				dashboardName: 'Infra overview',
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
					queryCapabilities: expect.objectContaining({
						requestType: 'time_series',
					}),
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

			// The resolved query is seeded with the panel-derived alert prefill.
			expect(mockBuildAlertUrl).toHaveBeenCalledWith(
				{ resolved: 'query' },
				PANEL_TYPES.TIME_SERIES,
				undefined,
				mockPrefill,
			);
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
