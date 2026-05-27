import { renderHook } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getViewQuery } from '../drilldownUtils';
import { AggregateData } from '../useAggregateDrilldown';
import useBaseDrilldownNavigate, {
	buildDrilldownUrl,
	getRoute,
} from '../useBaseDrilldownNavigate';

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: typeof mockSafeNavigate } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('../drilldownUtils', () => ({
	...jest.requireActual('../drilldownUtils'),
	getViewQuery: jest.fn(),
}));

const mockGetViewQuery = getViewQuery as jest.Mock;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_QUERY: Query = {
	id: 'q1',
	queryType: 'builder' as any,
	builder: {
		queryData: [
			{
				queryName: 'A',
				dataSource: 'metrics' as any,
				groupBy: [],
				expression: '',
				disabled: false,
				functions: [],
				legend: '',
				having: [],
				limit: null,
				stepInterval: undefined,
				orderBy: [],
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	promql: [],
	clickhouse_sql: [],
};

const MOCK_VIEW_QUERY: Query = {
	...MOCK_QUERY,
	builder: {
		...MOCK_QUERY.builder,
		queryData: [
			{
				...MOCK_QUERY.builder.queryData[0],
				filters: { items: [], op: 'AND' },
			},
		],
	},
};

const MOCK_AGGREGATE_DATA: AggregateData = {
	queryName: 'A',
	filters: [{ filterKey: 'service_name', filterValue: 'auth', operator: '=' }],
	timeRange: { startTime: 1000000, endTime: 2000000 },
};

// ─── getRoute ─────────────────────────────────────────────────────────────────

describe('getRoute', () => {
	it.each([
		['view_logs', ROUTES.LOGS_EXPLORER],
		['view_metrics', ROUTES.METRICS_EXPLORER],
		['view_traces', ROUTES.TRACES_EXPLORER],
	])('maps %s to the correct explorer route', (key, expected) => {
		expect(getRoute(key)).toBe(expected);
	});

	it('returns empty string for an unknown key', () => {
		expect(getRoute('view_dashboard')).toBe('');
	});
});

// ─── buildDrilldownUrl ────────────────────────────────────────────────────────

describe('buildDrilldownUrl', () => {
	beforeEach(() => {
		mockGetViewQuery.mockReturnValue(MOCK_VIEW_QUERY);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returns null for an unknown drilldown key', () => {
		const url = buildDrilldownUrl(
			MOCK_QUERY,
			MOCK_AGGREGATE_DATA,
			'view_dashboard',
		);
		expect(url).toBeNull();
	});

	it('returns null when getViewQuery returns null', () => {
		mockGetViewQuery.mockReturnValue(null);
		const url = buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_logs');
		expect(url).toBeNull();
	});

	it('returns a URL starting with the logs explorer route for view_logs', () => {
		const url = buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_logs');
		expect(url).not.toBeNull();
		expect(url).toContain(ROUTES.LOGS_EXPLORER);
	});

	it('returns a URL starting with the traces explorer route for view_traces', () => {
		const url = buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_traces');
		expect(url).toContain(ROUTES.TRACES_EXPLORER);
	});

	it('includes compositeQuery param in the URL', () => {
		const url = buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_logs');
		expect(url).toContain('compositeQuery=');
	});

	it('includes startTime and endTime when aggregateData has a timeRange', () => {
		const url = buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_logs');
		expect(url).toContain('startTime=1000000');
		expect(url).toContain('endTime=2000000');
	});

	it('omits startTime and endTime when aggregateData has no timeRange', () => {
		const { timeRange: _, ...withoutTimeRange } = MOCK_AGGREGATE_DATA;
		const url = buildDrilldownUrl(MOCK_QUERY, withoutTimeRange, 'view_logs');
		expect(url).not.toContain('startTime=');
		expect(url).not.toContain('endTime=');
	});

	it('includes summaryFilters param for view_metrics', () => {
		const url = buildDrilldownUrl(
			MOCK_QUERY,
			MOCK_AGGREGATE_DATA,
			'view_metrics',
		);
		expect(url).toContain(ROUTES.METRICS_EXPLORER);
		expect(url).toContain('summaryFilters=');
	});

	it('does not include summaryFilters param for non-metrics routes', () => {
		const url = buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_logs');
		expect(url).not.toContain('summaryFilters=');
	});

	it('handles null aggregateData by passing empty filters and empty queryName', () => {
		const url = buildDrilldownUrl(MOCK_QUERY, null, 'view_logs');
		expect(url).not.toBeNull();
		expect(mockGetViewQuery).toHaveBeenCalledWith(
			MOCK_QUERY,
			[],
			'view_logs',
			'',
		);
	});

	it('passes aggregateData filters and queryName to getViewQuery', () => {
		buildDrilldownUrl(MOCK_QUERY, MOCK_AGGREGATE_DATA, 'view_logs');
		expect(mockGetViewQuery).toHaveBeenCalledWith(
			MOCK_QUERY,
			MOCK_AGGREGATE_DATA.filters,
			'view_logs',
			MOCK_AGGREGATE_DATA.queryName,
		);
	});
});

// ─── useBaseDrilldownNavigate ─────────────────────────────────────────────────

describe('useBaseDrilldownNavigate', () => {
	beforeEach(() => {
		mockGetViewQuery.mockReturnValue(MOCK_VIEW_QUERY);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('calls safeNavigate with the built URL on a valid key', () => {
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: MOCK_AGGREGATE_DATA,
			}),
		);

		result.current('view_logs');

		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
		const [url] = mockSafeNavigate.mock.calls[0];
		expect(url).toContain(ROUTES.LOGS_EXPLORER);
		expect(url).toContain('compositeQuery=');
	});

	it('opens the explorer in a new tab', () => {
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: MOCK_AGGREGATE_DATA,
			}),
		);

		result.current('view_traces');

		expect(mockSafeNavigate).toHaveBeenCalledWith(expect.any(String), {
			newTab: true,
		});
	});

	it('calls callback after successful navigation', () => {
		const callback = jest.fn();
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: MOCK_AGGREGATE_DATA,
				callback,
			}),
		);

		result.current('view_logs');

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('does not call safeNavigate for an unknown key', () => {
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: MOCK_AGGREGATE_DATA,
			}),
		);

		result.current('view_dashboard');

		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('still calls callback when the key is unknown', () => {
		const callback = jest.fn();
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: MOCK_AGGREGATE_DATA,
				callback,
			}),
		);

		result.current('view_dashboard');

		expect(callback).toHaveBeenCalledTimes(1);
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('still calls callback when getViewQuery returns null', () => {
		mockGetViewQuery.mockReturnValue(null);
		const callback = jest.fn();
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: MOCK_AGGREGATE_DATA,
				callback,
			}),
		);

		result.current('view_logs');

		expect(callback).toHaveBeenCalledTimes(1);
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('handles null aggregateData without throwing', () => {
		const { result } = renderHook(() =>
			useBaseDrilldownNavigate({
				resolvedQuery: MOCK_QUERY,
				aggregateData: null,
			}),
		);

		expect(() => result.current('view_logs')).not.toThrow();
		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
	});
});
