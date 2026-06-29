import { initialQueriesMap } from 'constants/queryBuilder';
import { COMPOSITE_QUERY_KEY } from 'lib/compositeQuery/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { jsonAdapter } from './index';

const roundTrip = (query: Query): Query =>
	jsonAdapter.decode(jsonAdapter.encode(query));

describe('jsonAdapter', () => {
	describe('round-trip', () => {
		it.each(['metrics', 'logs', 'traces'] as const)(
			'round-trips %s baseline preserving dataSource',
			(source) => {
				const query = initialQueriesMap[source];
				const decoded = roundTrip(query);
				expect(decoded.builder.queryData[0].dataSource).toBe(source);
			},
		);
	});

	describe('legacy format compatibility', () => {
		it('encodes to legacy format (encodeURIComponent + JSON)', () => {
			const query = initialQueriesMap.logs;
			const params = jsonAdapter.encode(query);
			const encoded = params.get(COMPOSITE_QUERY_KEY) ?? '';

			expect(encoded).toBe(encodeURIComponent(JSON.stringify(query)));
			expect(encoded.startsWith('%7B')).toBe(true);
		});
	});

	describe('tag matching', () => {
		it('matches any value (catch-all fallback)', () => {
			const params1 = new URLSearchParams();
			params1.set(COMPOSITE_QUERY_KEY, '%7B%22queryType%22%3A%22builder%22%7D');
			expect(jsonAdapter.matches(params1)).toBe(true);

			const params2 = new URLSearchParams();
			params2.set(COMPOSITE_QUERY_KEY, 'z1~abc');
			expect(jsonAdapter.matches(params2)).toBe(true);
		});
	});

	describe('migration', () => {
		it('migrates old format (filters -> filter.expression)', () => {
			const legacy = {
				queryType: 'builder',
				builder: {
					queryData: [
						{
							dataSource: 'logs',
							queryName: 'A',
							filters: { op: 'AND', items: [] },
							aggregateOperator: 'count',
							aggregateAttribute: { key: '', dataType: '', type: '' },
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				promql: [],
				clickhouse_sql: [],
				id: 'x',
				unit: '',
			};
			const params = new URLSearchParams();
			params.set(COMPOSITE_QUERY_KEY, encodeURIComponent(JSON.stringify(legacy)));
			const decoded = jsonAdapter.decode(params);
			expect(decoded.builder.queryData[0].filter).toBeDefined();
			expect(decoded.builder.queryData[0].aggregations).toBeDefined();
		});
	});
});
