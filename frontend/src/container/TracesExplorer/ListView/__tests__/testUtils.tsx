import { ENVIRONMENT } from 'constants/env';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import ListView from '../index';

const BASE_URL = ENVIRONMENT.baseURL;
export const QUERY_RANGE_URL = `${BASE_URL}/api/v5/query_range`;

export const listRows = [
	{
		timestamp: '2024-07-19T08:39:58.735245Z',
		data: {
			name: 'HTTP GET',
			duration_nano: 55306000,
			http_method: 'GET',
			response_status_code: '200',
			span_id: '772c4d29dd9076ac',
			trace_id: '0000000000000000344ded1387b08a7e',
			attributes: { 'http.route': '/api/cart', 'cache.hit': false },
			resource: { 'service.name': 'frontend' },
		},
	},
	{
		timestamp: '2024-07-19T08:39:59.949129915Z',
		data: {
			name: 'authenticate_check_db',
			duration_nano: 790949390,
			// empty status fields to assert the "-" cell
			http_method: '',
			response_status_code: '',
			span_id: '5704353737b6778e',
			trace_id: 'a364a8e15af3e9a8c866e0528db8b637',
			attributes: {},
			resource: { 'service.name': 'demo-app' },
		},
	},
];

export const listResponse = (rows: unknown[]): Record<string, unknown> => ({
	data: { type: 'raw', data: { results: [{ queryName: 'A', rows }] } },
});

export const TRACE_SUMMARY_URL = `${BASE_URL}/api/v1/traces/:traceId/summary`;
export const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export type TraceBounds = Record<string, { start: number; end: number }>;

// Traces missing from `bounds` get a 404, like a trace with no summary row.
export const mockTraceSummary = (bounds: TraceBounds): void => {
	server.use(
		rest.get(TRACE_SUMMARY_URL, (req, res, ctx) => {
			const traceBounds = bounds[req.params.traceId as string];
			if (!traceBounds) {
				return res(ctx.status(404), ctx.json({ status: 'error' }));
			}
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						startTimestampMillis: traceBounds.start,
						endTimestampMillis: traceBounds.end,
						hasMissingSpans: false,
						rootServiceEntryPoint: '',
						rootServiceName: '',
						rootSpanStatusCode: '',
						totalErrorSpansCount: 0,
						totalSpansCount: 1,
					},
				}),
			);
		}),
	);
};

export const mockSuccess = (rows: unknown[] = listRows): void => {
	server.use(
		rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(listResponse(rows))),
		),
	);
};

export const renderListView = (
	stagedQuery: Query = initialQueriesMap.traces,
	viewportHeight = 500,
): ReturnType<typeof render> =>
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight, itemHeight: 54 }}>
			<ListView
				isFilterApplied={false}
				setWarning={jest.fn()}
				setIsLoadingQueries={jest.fn()}
			/>
		</VirtuosoMockContext.Provider>,
		{},
		{
			initialRoute: '/traces-explorer',
			queryBuilderOverrides: {
				panelType: PANEL_TYPES.LIST,
				stagedQuery,
				currentQuery: stagedQuery,
				redirectWithQueryBuilderData: jest.fn(),
			} as any,
		},
	);
