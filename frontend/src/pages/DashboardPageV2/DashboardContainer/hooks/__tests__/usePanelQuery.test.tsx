// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import { usePanelQuery } from '../usePanelQuery';
import { useGetQueryRangeV5 } from '../useGetQueryRangeV5';

jest.mock('react-redux', () => ({
	useSelector: jest.fn(),
}));

// usePanelQuery reads the query client only to cancel in-flight fetches; the
// fetch hook itself is mocked, so a stub client is enough.
jest.mock('react-query', () => ({
	useQueryClient: (): { cancelQueries: jest.Mock } => ({
		cancelQueries: jest.fn(),
	}),
}));

jest.mock('../useGetQueryRangeV5', () => ({
	useGetQueryRangeV5: jest.fn(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockUseGetQueryRangeV5 = useGetQueryRangeV5 as unknown as jest.Mock;

// ---- helpers ---------------------------------------------------------------

// Test fixtures are cast at the outer boundary; the perses-generated panel and
// query plugin unions are too verbose to construct field-typed inline.

function panelWith(
	panelKind: string,
	querySpec: Record<string, unknown>,
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			plugin: { kind: panelKind, spec: {} },
			queries: [
				{
					kind: 'TimeSeriesQuery',
					spec: {
						plugin: { kind: 'signoz/BuilderQuery', spec: querySpec },
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

function builderPanel(): DashboardtypesPanelDTO {
	return panelWith('signoz/TimeSeriesPanel', {
		name: 'A',
		signal: 'logs',
		filter: { expression: '' },
	});
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

// Nanoseconds, as redux globalTime stores them. 1e15 ns = 1e9 ms.
const DEFAULT_GLOBAL_TIME = {
	selectedTime: 'GLOBAL_TIME',
	minTime: 1_000_000_000_000_000,
	maxTime: 2_000_000_000_000_000,
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
	mockUseGetQueryRangeV5.mockReturnValue({
		data: undefined,
		isLoading: false,
		isFetching: false,
		error: null,
	});
});

// ---- tests -----------------------------------------------------------------

describe('usePanelQuery', () => {
	it('builds the generated V5 request DTO directly from panel.spec.queries', () => {
		renderHook(() => usePanelQuery({ panel: builderPanel(), panelId: 'p1' }));
		const [{ requestPayload }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(requestPayload.schemaVersion).toBe('v1');
		expect(requestPayload.compositeQuery.queries).toStrictEqual([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'logs', filter: { expression: '' } },
			},
		]);
	});

	it('converts redux nanosecond time to epoch ms on the request', () => {
		renderHook(() => usePanelQuery({ panel: builderPanel(), panelId: 'p1' }));
		const [{ requestPayload }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(requestPayload.start).toBe(1_000_000_000);
		expect(requestPayload.end).toBe(2_000_000_000);
	});

	it.each([
		['signoz/TimeSeriesPanel', 'time_series'],
		['signoz/ListPanel', 'raw'],
		// HISTOGRAM and BAR panels bin/derive from raw time-series data
		// client-side, so the backend must receive `time_series` (V1 parity).
		['signoz/HistogramPanel', 'time_series'],
		['signoz/BarChartPanel', 'time_series'],
		['signoz/NumberPanel', 'scalar'],
		['signoz/PieChartPanel', 'scalar'],
	])('%s panel sends requestType=%s', (panelKind, requestType) => {
		renderHook(() =>
			usePanelQuery({
				panel: panelWith(panelKind, { name: 'A', signal: 'logs' }),
				panelId: 'p1',
			}),
		);
		const [{ requestPayload }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(requestPayload.requestType).toBe(requestType);
	});

	it('exposes the raw V5 response, request payload, and legend map on data', () => {
		const v5Response = { status: 'success', data: { type: 'time_series' } };
		mockUseGetQueryRangeV5.mockReturnValue({
			data: v5Response,
			isLoading: false,
			isFetching: false,
			error: null,
		});

		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);

		expect(result.current.data.response).toBe(v5Response);
		expect(result.current.data.legendMap).toStrictEqual({ A: '' });
		expect(result.current.data.requestPayload?.schemaVersion).toBe('v1');
	});

	it('exposes an undefined response before data arrives', () => {
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.data.response).toBeUndefined();
	});

	it('exposes error from the fetch hook', () => {
		mockUseGetQueryRangeV5.mockReturnValue({
			data: undefined,
			isLoading: false,
			isFetching: false,
			error: new Error('boom'),
		});
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.error?.message).toBe('boom');
	});

	it('exposes isLoading (first fetch) and isFetching (any fetch) as distinct flags', () => {
		// A background refetch (data present elsewhere) is in flight: isFetching is
		// true but isLoading stays false so the panel keeps showing its data.
		mockUseGetQueryRangeV5.mockReturnValue({
			data: undefined,
			isLoading: false,
			isFetching: true,
			error: null,
		});
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isFetching).toBe(true);
	});

	it('reports isLoading on the first fetch (no cached data yet)', () => {
		mockUseGetQueryRangeV5.mockReturnValue({
			data: undefined,
			isLoading: true,
			isFetching: true,
			error: null,
		});
		const { result } = renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1' }),
		);
		expect(result.current.isLoading).toBe(true);
	});

	it('coerces a missing/undefined error to null', () => {
		mockUseGetQueryRangeV5.mockReturnValue({
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

	it('passes enabled=false to the fetch hook when the caller disables it', () => {
		renderHook(() =>
			usePanelQuery({ panel: builderPanel(), panelId: 'p1', enabled: false }),
		);
		const [{ enabled }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(enabled).toBe(false);
	});

	it('auto-disables the fetch when the panel has no queries (even with enabled=true)', () => {
		renderHook(() =>
			usePanelQuery({ panel: emptyPanel(), panelId: 'p1', enabled: true }),
		);
		const [{ enabled }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(enabled).toBe(false);
	});

	it('auto-disables the fetch when every metrics query is missing a metric name', () => {
		renderHook(() =>
			usePanelQuery({
				panel: panelWith('signoz/TimeSeriesPanel', {
					name: 'A',
					signal: 'metrics',
					aggregations: [{}],
				}),
				panelId: 'p1',
			}),
		);
		const [{ enabled }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(enabled).toBe(false);
	});

	it('composes a react-query cache key that includes panelId, time range, kind, and queries', () => {
		const panel = builderPanel();
		renderHook(() => usePanelQuery({ panel, panelId: 'p1' }));
		const [{ queryKey }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(queryKey).toStrictEqual(
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

	it('uses the time override (not redux) for the request window and cache key', () => {
		const panel = builderPanel();
		renderHook(() =>
			usePanelQuery({
				panel,
				panelId: 'p1',
				time: { startMs: 1_700_000_000_000, endMs: 1_700_000_600_000 },
			}),
		);
		const [{ requestPayload, queryKey }] = mockUseGetQueryRangeV5.mock.calls[0];
		// Window comes from the override, not the redux nanosecond time.
		expect(requestPayload.start).toBe(1_700_000_000_000);
		expect(requestPayload.end).toBe(1_700_000_600_000);
		// Cache key keys off the override so the preview refetches independently
		// of the dashboard and never collides with its redux-keyed entry.
		expect(queryKey).toStrictEqual(
			expect.arrayContaining([
				'p1',
				'override-1700000000000-1700000600000',
				'signoz/TimeSeriesPanel',
				panel.spec?.queries,
			]),
		);
		expect(queryKey).not.toContain(DEFAULT_GLOBAL_TIME.minTime);
	});

	it('floors fractional override ms — V1 time helpers emit floats but start/end are int64', () => {
		renderHook(() =>
			usePanelQuery({
				panel: builderPanel(),
				panelId: 'p1',
				time: { startMs: 1_700_000_000_000.546, endMs: 1_700_000_600_000.999 },
			}),
		);
		const [{ requestPayload, queryKey }] = mockUseGetQueryRangeV5.mock.calls[0];
		expect(requestPayload.start).toBe(1_700_000_000_000);
		expect(requestPayload.end).toBe(1_700_000_600_000);
		// The cache key carries the floored values so it matches the request.
		expect(queryKey).toStrictEqual(
			expect.arrayContaining(['override-1700000000000-1700000600000']),
		);
	});

	describe('list pagination', () => {
		const listPanel = (
			querySpec: Record<string, unknown>,
		): DashboardtypesPanelDTO =>
			panelWith('signoz/ListPanel', { name: 'A', signal: 'logs', ...querySpec });

		it('exposes server paging at the default page size when the query has no limit', () => {
			const { result } = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);
			expect(result.current.pagination).toBeDefined();
			expect(result.current.pagination?.pageSize).toBe(25);
			expect(result.current.pagination?.pageSizeOptions).toStrictEqual([
				10, 25, 50, 100, 200,
			]);
		});

		it('disables the server pager when the query has an explicit limit (V1 parity)', () => {
			const { result } = renderHook(() =>
				usePanelQuery({ panel: listPanel({ limit: 100 }), panelId: 'p1' }),
			);
			expect(result.current.pagination).toBeUndefined();
		});

		it('keeps previous data while paging so the table/pager stay mounted on page change', () => {
			renderHook(() => usePanelQuery({ panel: listPanel({}), panelId: 'p1' }));
			const [{ keepPreviousData }] = mockUseGetQueryRangeV5.mock.calls[0];
			expect(keepPreviousData).toBe(true);
		});

		it('changes the page size (and re-requests with the new limit) via setPageSize', () => {
			const { result } = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);

			act(() => result.current.pagination?.setPageSize(50));

			expect(result.current.pagination?.pageSize).toBe(50);
			const lastCall = mockUseGetQueryRangeV5.mock.calls.at(-1) as [
				{ queryKey: unknown[] },
			];
			// Page size participates in the cache key so each size is its own entry.
			expect(lastCall[0].queryKey).toStrictEqual(expect.arrayContaining([50]));
		});

		// A raw V5 response carrying `rowCount` rows (+ an optional cursor), shaped
		// the way getRawResults reads it.
		const rawResponse = (rowCount: number, nextCursor?: string): unknown => ({
			data: {
				type: 'raw',
				data: {
					results: [
						{
							rows: Array.from({ length: rowCount }, () => ({ data: {} })),
							...(nextCursor ? { nextCursor } : {}),
						},
					],
				},
			},
		});

		const withResponse = (response: unknown): void => {
			mockUseGetQueryRangeV5.mockReturnValue({
				data: response,
				isLoading: false,
				isFetching: false,
				error: null,
			});
		};

		it('starts on page 0 with no prev/next and does not throw before data arrives', () => {
			const { result } = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);
			expect(result.current.pagination?.pageIndex).toBe(0);
			expect(result.current.pagination?.canPrev).toBe(false);
			expect(result.current.pagination?.canNext).toBe(false);
		});

		it('drives canNext from the response cursor, not the row count', () => {
			// Full page but no cursor → backend says these are the last rows.
			withResponse(rawResponse(25));
			const noCursor = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);
			expect(noCursor.result.current.pagination?.canNext).toBe(false);

			// Cursor present (even on a partial page) → more rows.
			withResponse(rawResponse(3, 'cursor-1'));
			const withCursor = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);
			expect(withCursor.result.current.pagination?.canNext).toBe(true);
		});

		it('advances pageIndex and enables canPrev after goNext', () => {
			withResponse(rawResponse(25));
			// Stable panel reference: a fresh one each render would change the
			// `queries` identity and trip the offset-reset effect (real props are stable).
			const panel = listPanel({});
			const { result } = renderHook(() => usePanelQuery({ panel, panelId: 'p1' }));
			expect(result.current.pagination?.pageIndex).toBe(0);

			act(() => result.current.pagination?.goNext());

			expect(result.current.pagination?.pageIndex).toBe(1);
			expect(result.current.pagination?.canPrev).toBe(true);
		});

		it('stays defined and zero-paged for a non-raw (scalar) response', () => {
			withResponse({ data: { type: 'scalar', data: { results: [] } } });
			const { result } = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);
			expect(result.current.pagination).toBeDefined();
			expect(result.current.pagination?.canNext).toBe(false);
			expect(result.current.pagination?.pageIndex).toBe(0);
		});

		it('ignores a non-positive page size so paging never goes invalid', () => {
			const { result } = renderHook(() =>
				usePanelQuery({ panel: listPanel({}), panelId: 'p1' }),
			);
			act(() => result.current.pagination?.setPageSize(0));
			expect(result.current.pagination?.pageSize).toBe(25);
			expect(result.current.pagination?.pageIndex).toBe(0);
		});
	});
});
