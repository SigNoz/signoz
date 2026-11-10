import {
	initialQueriesMap,
	initialQueryBuilderFormTraceOperatorValues,
} from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	listResponse,
	listRows,
	mockSuccess,
	QUERY_RANGE_URL,
	renderListView,
} from './__tests__/testUtils';

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

		// empty status fields render the dash icon
		expect(screen.getAllByTestId('empty-value').length).toBeGreaterThanOrEqual(1);
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
