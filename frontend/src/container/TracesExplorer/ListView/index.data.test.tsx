import { ENVIRONMENT } from 'constants/env';
import {
	initialQueriesMap,
	initialQueryBuilderFormTraceOperatorValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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
		let requestBody: any;
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				requestBody = await req.json();
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
		const { queries } = requestBody.compositeQuery;
		expect(queries).toHaveLength(2);
		queries.forEach((query: { spec: { selectFields?: unknown } }) => {
			expect(query.spec.selectFields).toBeUndefined();
		});
	});
});
