import { renderHook } from '@testing-library/react';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { validateQuery } from 'utils/queryValidationUtils';

import * as store from 'lib/recentQueries/store';

import { useSaveRecentQuery } from './useSaveRecentQuery';

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

describe('useSaveRecentQuery', () => {
	beforeEach(() => {
		store.__resetForTests();
		mockedValidateQuery.mockReturnValue({
			isValid: true,
			message: '',
			errors: [],
		});
	});

	it('saves the staged query when validation passes', () => {
		const stagedQuery = buildQuery();

		renderHook(() => useSaveRecentQuery(stagedQuery));

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
		const stagedQuery = buildQuery();

		renderHook(() => useSaveRecentQuery(stagedQuery));

		expect(store.list('logs')).toHaveLength(0);
	});

	it('does not save a builder query with an empty filter expression', () => {
		const stagedQuery = buildQuery([{ filter: { expression: '' } }]);

		renderHook(() => useSaveRecentQuery(stagedQuery));

		expect(store.list('logs')).toHaveLength(0);
	});

	it('saves each builder query in the composite separately', () => {
		const stagedQuery = buildQuery([
			{
				dataSource: DataSource.LOGS,
				filter: { expression: 'service.name = "a"' },
			},
			{
				dataSource: DataSource.TRACES,
				filter: { expression: 'service.name = "b"' },
			},
		]);

		renderHook(() => useSaveRecentQuery(stagedQuery));

		expect(store.list('logs')).toHaveLength(1);
		expect(store.list('traces')).toHaveLength(1);
	});

	it('does not re-save when the staged query has not changed', () => {
		const stagedQuery = buildQuery();

		const { rerender } = renderHook(
			({ q }: { q: Query }) => useSaveRecentQuery(q),
			{ initialProps: { q: stagedQuery } },
		);

		const firstTimestamp = store.list('logs')[0].lastUsedAt;
		rerender({ q: stagedQuery });

		const second = store.list('logs');
		expect(second).toHaveLength(1);
		expect(second[0].lastUsedAt).toBe(firstTimestamp);
	});

	it('re-saves when the staged query filter changes', () => {
		const initial = buildQuery([{ filter: { expression: 'a = 1' } }]);
		const changed = buildQuery([{ filter: { expression: 'b = 2' } }]);

		const { rerender } = renderHook(
			({ q }: { q: Query }) => useSaveRecentQuery(q),
			{ initialProps: { q: initial } },
		);

		expect(store.list('logs')).toHaveLength(1);
		rerender({ q: changed });
		expect(store.list('logs')).toHaveLength(2);
	});

	it('is a no-op when stagedQuery is null', () => {
		renderHook(() => useSaveRecentQuery(null));

		expect(store.list('logs')).toHaveLength(0);
	});
});
