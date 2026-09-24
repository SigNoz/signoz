import { ENVIRONMENT } from 'constants/env';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen } from 'tests/test-utils';

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
// so the query fires and the expected columns render, independent of that API.
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
			'service.name': 'frontend',
			name: 'HTTP GET',
			duration_nano: 55306000,
			http_method: 'GET',
			response_status_code: '200',
			span_id: '772c4d29dd9076ac',
			trace_id: '0000000000000000344ded1387b08a7e',
		},
	},
	{
		timestamp: '2024-07-19T08:39:59.949129915Z',
		data: {
			'service.name': 'demo-app',
			name: 'authenticate_check_db',
			duration_nano: 790949390,
			// empty status fields to assert the "-" cell
			http_method: '',
			response_status_code: '',
			span_id: '5704353737b6778e',
			trace_id: 'a364a8e15af3e9a8c866e0528db8b637',
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

const renderListView = (): ReturnType<typeof render> =>
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
				stagedQuery: initialQueriesMap.traces,
				currentQuery: initialQueriesMap.traces,
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
});
