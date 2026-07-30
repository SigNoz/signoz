import { DataSource } from 'types/common/queryBuilder';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { validateQuery } from 'utils/queryValidationUtils';

import * as store from './recentQueriesStore';
import { saveRecentQuery } from './saveRecentQuery';

jest.mock('utils/queryValidationUtils', () => ({
	validateQuery: jest.fn(),
}));

const mockedValidateQuery = validateQuery as jest.MockedFunction<
	typeof validateQuery
>;

const buildComposite = (
	overrides: Partial<IBuilderQuery>[] = [{}],
): { builder: { queryData: IBuilderQuery[] } } => ({
	builder: {
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

	it('saves the composite query when validation passes', () => {
		saveRecentQuery(buildComposite());

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

		saveRecentQuery(buildComposite());

		expect(store.list('logs')).toHaveLength(0);
	});

	it('does not save a builder query with an empty filter expression', () => {
		saveRecentQuery(buildComposite([{ filter: { expression: '' } }]));

		expect(store.list('logs')).toHaveLength(0);
	});

	it('saves each builder query in the composite separately', () => {
		saveRecentQuery(
			buildComposite([
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

	it('skips builder queries whose dataSource is not a supported signal', () => {
		saveRecentQuery(
			buildComposite([{ dataSource: 'unknown' as IBuilderQuery['dataSource'] }]),
		);

		expect(store.list('logs')).toHaveLength(0);
		expect(store.list('traces')).toHaveLength(0);
		expect(store.list('metrics')).toHaveLength(0);
	});

	it('is a no-op when the composite is null, undefined, or empty', () => {
		saveRecentQuery(null);
		saveRecentQuery(undefined);
		saveRecentQuery({ builder: { queryData: [] } });
		saveRecentQuery({});

		expect(store.list('logs')).toHaveLength(0);
	});
});
