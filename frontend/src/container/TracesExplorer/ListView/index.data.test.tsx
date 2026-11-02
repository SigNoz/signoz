import remove from 'api/browser/localstorage/remove';
import set from 'api/browser/localstorage/set';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	initialQueriesMap,
	initialQueryBuilderFormTraceOperatorValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import ListView from './index';

// globalTime starts with loading:true, which gates the list query. Force just that
// slice's loading to false so the query fires; every other selector is untouched.
jest.mock('react-redux', () => {
	const actual = jest.requireActual('react-redux');
	return {
		...actual,
		useSelector: (selector: (state: unknown) => unknown): unknown => {
			const result = actual.useSelector(selector);
			if (result && typeof result === 'object' && 'loading' in result) {
				return { ...result, loading: false };
			}
			return result;
		},
	};
});

// List columns come from the options menu (server-synced preferences). Pin them
// so the expected columns render, independent of that API.
jest.mock('container/OptionsMenu/useOptionsMenu', () => ({
	__esModule: true,
	default: (): unknown => ({
		options: {
			selectColumns: [
				{ name: 'service.name', fieldContext: 'resource' },
				{ name: 'name', fieldContext: 'span' },
				{ name: 'duration_nano', fieldContext: 'span' },
				{ name: 'http_method', fieldContext: 'span' },
				{ name: 'response_status_code', fieldContext: 'span' },
				{ name: 'http.route', fieldContext: 'attribute' },
				{ name: 'cache.hit', fieldContext: 'attribute' },
			],
		},
		config: { addColumn: { onRemove: jest.fn() } },
	}),
}));

const BASE_URL = ENVIRONMENT.baseURL;
const QUERY_RANGE_URL = `${BASE_URL}/api/v5/query_range`;

const listRows = [
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

const listResponse = (rows: unknown[]): Record<string, unknown> => ({
	data: { type: 'raw', data: { results: [{ queryName: 'A', rows }] } },
});

const TRACE_SUMMARY_URL = `${BASE_URL}/api/v1/traces/:traceId/summary`;
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

type TraceBounds = Record<string, { start: number; end: number }>;

// Traces missing from `bounds` get a 404, like a trace with no summary row.
const mockTraceSummary = (bounds: TraceBounds): void => {
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

const mockSuccess = (rows: unknown[] = listRows): void => {
	server.use(
		rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(listResponse(rows))),
		),
	);
};

const renderListView = (
	stagedQuery: Query = initialQueriesMap.traces,
): ReturnType<typeof render> =>
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 500, itemHeight: 54 }}>
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

describe('Traces ListView - Data Loaded', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('renders backend rows in FieldCell format', async () => {
		mockSuccess();
		renderListView();

		// plain-text columns
		await expect(screen.findByText('frontend')).resolves.toBeInTheDocument();
		expect(screen.getByText('authenticate_check_db')).toBeInTheDocument();

		// attribute column reads from the attributes map
		expect(screen.getByText('/api/cart')).toBeInTheDocument();
		expect(screen.getByText('false')).toBeInTheDocument();

		// duration_nano renders in milliseconds
		expect(screen.getAllByTestId('duration_nano')[0]).toHaveTextContent(/ms$/);

		// http_method / response_status_code render as badges
		expect(screen.getAllByTestId('http_method')[0]).toHaveTextContent('GET');
		expect(screen.getAllByTestId('response_status_code')[0]).toHaveTextContent(
			'200',
		);

		// empty status fields render "-"
		expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
	});

	it('requests every span field instead of the selected columns', async () => {
		let requestBody: QueryRangeRequestV5 | undefined;
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				requestBody = await req.json<QueryRangeRequestV5>();
				return res(ctx.status(200), ctx.json(listResponse(listRows)));
			}),
		);
		const selectColumns = [{ name: 'http.route', fieldContext: 'attribute' }];
		const { builder } = initialQueriesMap.traces;
		renderListView({
			...initialQueriesMap.traces,
			builder: {
				...builder,
				queryData: [{ ...builder.queryData[0], selectColumns }],
				queryTraceOperator: [
					{
						...initialQueryBuilderFormTraceOperatorValues,
						expression: 'A',
						selectColumns,
					},
				],
			},
		} as Query);

		await expect(screen.findByText('frontend')).resolves.toBeInTheDocument();
		const queries = requestBody?.compositeQuery.queries ?? [];
		expect(queries).toHaveLength(2);
		queries.forEach(({ spec }) => {
			expect(spec).not.toHaveProperty('selectFields');
		});
	});
});

describe('Traces ListView - span drawer', () => {
	beforeEach(() => {
		set(LOCALSTORAGE.TRACES_SPAN_DRAWER_ENABLED, 'true');
		mockSuccess();
		mockTraceSummary({});
	});

	afterEach(() => {
		remove(LOCALSTORAGE.TRACES_SPAN_DRAWER_ENABLED);
		server.resetHandlers();
	});

	it('opens the clicked span and steps through rows with the arrow keys', async () => {
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));

		const drawer = await screen.findByTestId('span-details-drawer');
		expect(within(drawer).getByText('HTTP GET')).toBeInTheDocument();
		expect(within(drawer).getByTestId('span-details-trace-id')).toHaveTextContent(
			'0000000000000000344ded1387b08a7e',
		);

		await user.keyboard('{ArrowDown}');
		await expect(
			within(drawer).findByText('authenticate_check_db'),
		).resolves.toBeInTheDocument();

		await user.keyboard('{ArrowUp}');
		await expect(
			within(drawer).findByText('HTTP GET'),
		).resolves.toBeInTheDocument();
	});

	it('requests span logs over whole milliseconds', async () => {
		const logsRequests: QueryRangeRequestV5[] = [];
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				const body = await req.json<QueryRangeRequestV5>();
				const spec = body.compositeQuery.queries[0]?.spec;
				if (spec && 'signal' in spec && spec.signal === 'logs') {
					logsRequests.push(body);
				}
				return res(ctx.status(200), ctx.json(listResponse(listRows)));
			}),
		);
		const user = userEvent.setup();
		renderListView();

		// Its 790.94939 ms duration makes the span window end mid-millisecond.
		await user.click(await screen.findByText('authenticate_check_db'));

		await waitFor(() => expect(logsRequests.length).toBeGreaterThan(0));
		logsRequests.forEach(({ start, end }) => {
			expect(Number.isInteger(start)).toBe(true);
			expect(Number.isInteger(end)).toBe(true);
		});
	});

	it('reads the trace bounds from the trace summary', async () => {
		const bounds: TraceBounds = {
			'0000000000000000344ded1387b08a7e': {
				start: Date.parse('2024-07-19T08:39:58.700Z'),
				end: Date.parse('2024-07-19T08:39:58.900Z'),
			},
			a364a8e15af3e9a8c866e0528db8b637: {
				start: Date.parse('2024-07-19T08:39:59.900Z'),
				end: Date.parse('2024-07-19T08:40:01.000Z'),
			},
		};
		mockTraceSummary(bounds);
		const logsRequests: { traceId: string; start: number; end: number }[] = [];
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				const body = await req.json<QueryRangeRequestV5>();
				const spec = body.compositeQuery.queries[0]?.spec;
				if (spec && 'signal' in spec && spec.signal === 'logs') {
					const traceId =
						Object.keys(bounds).find((id) => spec.filter?.expression?.includes(id)) ??
						'';
					// The payload carries the window in µs.
					logsRequests.push({
						traceId,
						start: body.start / 1e3,
						end: body.end / 1e3,
					});
					return res(ctx.status(200), ctx.json(listResponse([])));
				}
				return res(ctx.status(200), ctx.json(listResponse(listRows)));
			}),
		);
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));
		const drawer = await screen.findByTestId('span-details-drawer');
		await expect(
			within(drawer).findByText(/of total exec time/),
		).resolves.toBeInTheDocument();

		// The next span is in another trace, so it needs that trace's bounds.
		await user.keyboard('{ArrowDown}');
		await waitFor(() =>
			expect(logsRequests.map(({ traceId }) => traceId)).toContain(
				'a364a8e15af3e9a8c866e0528db8b637',
			),
		);

		// Logs wait for the bounds: no request ever goes out with another window.
		logsRequests.forEach(({ traceId, start, end }) => {
			expect(start).toBe(bounds[traceId].start - FIVE_MINUTES_IN_MS);
			expect(end).toBe(bounds[traceId].end + FIVE_MINUTES_IN_MS);
		});
	});

	it('speaks only for the span when the trace has no summary', async () => {
		const logsFilters: string[] = [];
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				const body = await req.json<QueryRangeRequestV5>();
				const spec = body.compositeQuery.queries[0]?.spec;
				if (spec && 'signal' in spec && spec.signal === 'logs') {
					logsFilters.push(spec.filter?.expression ?? '');
					return res(ctx.status(200), ctx.json(listResponse([])));
				}
				return res(ctx.status(200), ctx.json(listResponse(listRows)));
			}),
		);
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));
		const drawer = await screen.findByTestId('span-details-drawer');

		await user.click(within(drawer).getByRole('tab', { name: /logs/i }));
		await expect(
			within(drawer).findByText('No logs found for this span.'),
		).resolves.toBeInTheDocument();
		// Checked once the 404 has settled; before it, exec time is absent anyway.
		expect(
			within(drawer).queryByText(/of total exec time/),
		).not.toBeInTheDocument();
		// No trace-wide check: every logs request is scoped to the span.
		expect(logsFilters.length).toBeGreaterThan(0);
		logsFilters.forEach((expression) => {
			expect(expression).toContain('span_id');
		});
	});

	it('closes the drawer', async () => {
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));
		await screen.findByTestId('span-details-drawer');

		await user.click(screen.getByTestId('span-drawer-close'));

		await waitFor(() =>
			expect(screen.queryByTestId('span-details-drawer')).not.toBeInTheDocument(),
		);
	});

	it('stays open on a press in the drawer or the list, and closes on one outside', async () => {
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));
		const drawer = await screen.findByTestId('span-details-drawer');

		await user.click(drawer);
		// Hovering re-renders the row, so the press needs a fresh query.
		await user.hover(screen.getByText('authenticate_check_db'));
		await user.click(screen.getByText('authenticate_check_db'));
		await expect(
			within(drawer).findByText('authenticate_check_db'),
		).resolves.toBeInTheDocument();

		await user.click(document.body);
		await waitFor(() =>
			expect(screen.queryByTestId('span-details-drawer')).not.toBeInTheDocument(),
		);
	});
});
