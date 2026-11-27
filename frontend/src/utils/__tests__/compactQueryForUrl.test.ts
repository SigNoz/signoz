import { initialQueriesMap } from 'constants/queryBuilder';
import { normalizeCompositeQuery } from 'hooks/queryBuilder/normalizeCompositeQuery';
import ROUTES from 'constants/routes';
import { EQueryType } from 'types/common/dashboard';

import { compactQueryForUrl } from '../compactQueryForUrl';

describe('compactQueryForUrl', () => {
	it.each(Object.entries(initialQueriesMap))(
		'round-trips the %s query without rewriting its URL',
		(_signal, query) => {
			const before = JSON.stringify(query);
			const compact = compactQueryForUrl(query);
			const encoded = encodeURIComponent(JSON.stringify(compact));
			const decoded = JSON.parse(decodeURIComponent(encoded));

			expect(compact).not.toHaveProperty('promql');
			expect(compact).not.toHaveProperty('clickhouse_sql');
			expect(compact.builder).not.toHaveProperty('queryFormulas');
			expect(compact.builder).not.toHaveProperty('queryTraceOperator');
			expect(encoded.length).toBeLessThan(encodeURIComponent(before).length);
			expect(normalizeCompositeQuery(decoded, ROUTES.HOME)).toStrictEqual({
				query,
				changed: false,
			});
			expect(JSON.stringify(query)).toBe(before);
		},
	);

	it.each([EQueryType.PROM, EQueryType.CLICKHOUSE])(
		'keeps edited queries and falsy values in %s mode',
		(queryType) => {
			const query = {
				...initialQueriesMap.metrics,
				queryType,
				promql: [{ name: 'B', query: 'up', legend: '', disabled: false }],
				clickhouse_sql: [
					{ name: 'C', query: 'SELECT 0', legend: '', disabled: true },
				],
				builder: {
					...initialQueriesMap.metrics.builder,
					queryData: [
						{
							...initialQueriesMap.metrics.builder.queryData[0],
							limit: 0,
							disabled: false,
							legend: '',
						},
					],
					queryFormulas: [
						{ expression: 'A * 0', queryName: 'F1', disabled: false, legend: '' },
					],
					queryTraceOperator: initialQueriesMap.traces.builder.queryData,
				},
			};

			expect(compactQueryForUrl(query)).toStrictEqual(query);
			expect(
				normalizeCompositeQuery(compactQueryForUrl(query), ROUTES.HOME),
			).toStrictEqual({ query, changed: false });
		},
	);

	it('keeps empty lists and edited blank queries that are not the defaults', () => {
		const query = {
			...initialQueriesMap.logs,
			promql: [],
			clickhouse_sql: [{ name: 'B', query: '', legend: '', disabled: false }],
		};
		const compact = compactQueryForUrl(query);

		expect(compact.promql).toStrictEqual([]);
		expect(compact.clickhouse_sql).toStrictEqual(query.clickhouse_sql);
		expect(normalizeCompositeQuery(compact, ROUTES.HOME)).toStrictEqual({
			query,
			changed: false,
		});
	});
});
