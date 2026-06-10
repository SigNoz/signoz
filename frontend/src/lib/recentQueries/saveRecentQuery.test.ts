import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { validateQuery } from 'utils/queryValidationUtils';

import * as store from './recentQueriesStore';
import { saveRecentQuery } from './saveRecentQuery';

jest.mock('utils/queryValidationUtils', () => ({
	validateQuery: jest.fn(),
}));

const mockedValidateQuery = validateQuery as jest.MockedFunction<
	typeof validateQuery
>;

const buildQuery = (overrides: Partial<IBuilderQuery>[] = [{}]): Query => ({
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	clickhouse_sql: [],
	id: 'q1',
	builder: {
		queryFormulas: [],
		queryTraceOperator: [],
		queryData: overrides.map((o, i) => ({
			queryName: `Q${i}`,
			dataSource: DataSource.LOGS,
			aggregateOperator: 'count',
			aggregateAttribute: undefined as never,
			functions: [],
			filter: { expression: 'service.name = "frontend"' },
			groupBy: [],
			expression: `Q${i}`,
			disabled: false,
			having: [],
			limit: null,
			stepInterval: null,
			orderBy: [],
			legend: '',
			...o,
		})) as IBuilderQuery[],
	},
});

describe('saveRecentQuery', () => {
	beforeEach(() => {
		store.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
		mockedValidateQuery.mockReturnValue({
			isValid: true,
			message: '',
			errors: [],
		});
	});

	it('saves the query when validation passes', () => {
		saveRecentQuery(buildQuery());

		const entries = store.list('logs');
		expect(entries).toHaveLength(1);
		expect(entries[0].filter.expression).toBe('service.name = "frontend"');
	});

	it('does not save when validateQuery rejects the expression', () => {
		mockedValidateQuery.mockReturnValue({
			isValid: false,
			message: 'bad',
			errors: [],
		});

		saveRecentQuery(buildQuery());

		expect(store.list('logs')).toHaveLength(0);
	});

	it('does not save a builder query with an empty filter expression', () => {
		saveRecentQuery(buildQuery([{ filter: { expression: '' } }]));

		expect(store.list('logs')).toHaveLength(0);
	});

	it('saves each builder query in the composite separately', () => {
		saveRecentQuery(
			buildQuery([
				{
					dataSource: DataSource.LOGS,
					filter: { expression: "service.name = 'frontend'" },
				},
				{
					dataSource: DataSource.TRACES,
					filter: { expression: "service.name = 'orders-api'" },
				},
			]),
		);

		expect(store.list('logs')).toHaveLength(1);
		expect(store.list('traces')).toHaveLength(1);
	});

	it('keeps a single entry when the same query is run again', () => {
		saveRecentQuery(buildQuery());
		saveRecentQuery(buildQuery());

		expect(store.list('logs')).toHaveLength(1);
	});

	it('adds a second entry when the filter changes', () => {
		saveRecentQuery(
			buildQuery([{ filter: { expression: "severity_text = 'ERROR'" } }]),
		);
		saveRecentQuery(
			buildQuery([{ filter: { expression: 'http.status_code >= 500' } }]),
		);

		expect(store.list('logs')).toHaveLength(2);
	});

	it('is a no-op when the query is null', () => {
		saveRecentQuery(null);

		expect(store.list('logs')).toHaveLength(0);
	});
});
