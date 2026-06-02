// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { EQueryType } from 'types/common/dashboard';

import { usePanelQuery } from '../../hooks/usePanelQuery';

jest.mock('lib/getStartEndRangeTime', () => ({
	__esModule: true,
	default: jest.fn(() => ({ start: '100', end: '200' })),
}));

jest.mock('react-redux', () => ({
	useSelector: jest.fn(),
}));

jest.mock('hooks/queryBuilder/useGetQueryRange', () => ({
	useGetQueryRange: jest.fn(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockUseGetQueryRange = useGetQueryRange as unknown as jest.Mock;

// ---- helpers ---------------------------------------------------------------

// Test fixtures are cast at the outer boundary; the perses-generated panel and
// query plugin unions are too verbose to construct field-typed inline.

function builderPanel(): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [
				{
					kind: 'TimeSeriesQuery',
					spec: {
						plugin: {
							kind: 'signoz/BuilderQuery',
							spec: {
								name: 'A',
								signal: 'metrics',
								filter: { expression: '' },
							},
						},
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

function listPanelWithLogs(): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			plugin: { kind: 'signoz/ListPanel', spec: {} },
			queries: [
				{
					kind: 'LogQuery',
					spec: {
						plugin: {
							kind: 'signoz/BuilderQuery',
							spec: {
								name: 'A',
								signal: 'logs',
								filter: { expression: '' },
							},
						},
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

function emptyPanel(): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [],
		},
	} as unknown as DashboardtypesPanelDTO;
}

const DEFAULT_GLOBAL_TIME = {
	selectedTime: 'GLOBAL_TIME',
	minTime: 1000,
	maxTime: 2000,
	isAutoRefreshDisabled: false,
};

beforeEach(() => {
	jest.clearAllMocks();
	mockUseSelector.mockImplementation((selector: unknown) => {
		// usePanelQuery passes a selector `(state) => state.globalTime`.
		return (
			selector as (state: { globalTime: typeof DEFAULT_GLOBAL_TIME }) => unknown
		)({ globalTime: DEFAULT_GLOBAL_TIME });
	});
	mockUseGetQueryRange.mockReturnValue({
		data: undefined,
		isLoading: false,
		isFetching: false,
		error: null,
	});
});

// ---- tests -----------------------------------------------------------------

describe('usePanelQuery', () => {
	it('runs fromPerses on the panel queries and forwards the V1 Query to useGetQueryRange', () => {
		renderHook(() => usePanelQuery({ panel: builderPanel(), panelId: 'p1' }));
		const [requestArg] = mockUseGetQueryRange.mock.calls[0];
		expect(requestArg.query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(requestArg.query.builder.queryData).toHaveLength(1);
		expect(requestArg.query.builder.queryData[0].queryName).toBe('A');
	});

	it('derives graphType=TIME_SERIES for a TimeSeries panel', () => {
		renderHook(() => usePanelQuery({ panel: builderPanel(), panelId: 'p1' }));
		const [requestArg] = mockUseGetQueryRange.mock.calls[0];
		expect(requestArg.graphType).toBe(PANEL_TYPES.TIME_SERIES);
	});

	it('derives graphType=LIST for a ListPanel', () => {
		renderHook(() =>
			usePanelQuery({ panel: listPanelWithLogs(), panelId: 'p1' }),
		);
		const [requestArg] = mockUseGetQueryRange.mock.calls[0];
		expect(requestArg.graphType).toBe(PANEL_TYPES.LIST);
	});

	it('passes V5 entity version to useGetQueryRange', () => {
		renderHook(() => usePanelQuery({ panel: builderPanel(), panelId: 'p1' }));
		const [, version] = mockUseGetQueryRange.mock.calls[0];
		expect(version).toBe(ENTITY_VERSION_V5);
	});

	it('exposes data/error from useGetQueryRange', () => {
		mockUseGetQueryRange.mockReturnValue({
			data: { payload: 'X' } as unknown,
			isLoading: false,
			isFetching: false,
			error: new Error('boom'),
		});
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.data).toStrictEqual({ payload: 'X' });
		expect(result.current.error?.message).toBe('boom');
	});

	it('combines isLoading and isFetching into a single isLoading flag', () => {
		mockUseGetQueryRange.mockReturnValue({
			data: undefined,
			isLoading: false,
			isFetching: true,
			error: null,
		});
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.isLoading).toBe(true);
	});

	it('coerces a missing/undefined error to null', () => {
		mockUseGetQueryRange.mockReturnValue({
			data: undefined,
			isLoading: false,
			isFetching: false,
			error: undefined,
		});
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.error).toBeNull();
	});

	it('passes enabled=false to useGetQueryRange when the caller disables it', () => {
		renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1', enabled: false }),
		);
		const [, , opts] = mockUseGetQueryRange.mock.calls[0];
		expect(opts.enabled).toBe(false);
	});

	it('auto-disables the fetch when the panel has no queries (even with enabled=true)', () => {
		renderHook(() =>
			usePanelQuery({ panel: emptyPanel(), panelId: 'p1', enabled: true }),
		);
		const [, , opts] = mockUseGetQueryRange.mock.calls[0];
		expect(opts.enabled).toBe(false);
	});

	it('composes a react-query cache key that includes panelId, time range, kind, and queries', () => {
		const panel = builderPanel();
		renderHook(() => usePanelQuery({ panel, panelId: 'p1' }));
		const [, , opts] = mockUseGetQueryRange.mock.calls[0];
		expect(opts.queryKey).toStrictEqual(
			expect.arrayContaining([
				'p1',
				DEFAULT_GLOBAL_TIME.minTime,
				DEFAULT_GLOBAL_TIME.maxTime,
				DEFAULT_GLOBAL_TIME.selectedTime,
				'signoz/TimeSeriesPanel',
				panel.spec?.queries,
			]),
		);
	});

	it('forwards the inflated empty composite to useGetQueryRange when panel is undefined (no crash)', () => {
		renderHook(() => usePanelQuery({ panel: undefined, panelId: 'p-none' }));
		const [requestArg] = mockUseGetQueryRange.mock.calls[0];
		expect(requestArg.query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(requestArg.query.builder.queryData).toStrictEqual([]);
	});
});
