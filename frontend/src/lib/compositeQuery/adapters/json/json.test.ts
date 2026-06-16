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

	describe('encoding', () => {
		it('encodes using single URL encoding via URLSearchParams', () => {
			const query = initialQueriesMap.logs;
			const params = jsonAdapter.encode(query);
			const raw = params.get(COMPOSITE_QUERY_KEY) ?? '';

			// URLSearchParams.get() returns decoded value, so raw === JSON string
			expect(raw).toBe(JSON.stringify(query));
			expect(raw.startsWith('{')).toBe(true);

			// Full URL shows single encoding
			const fullUrl = params.toString();
			expect(fullUrl).toContain('%7B'); // encoded {
			expect(fullUrl).not.toContain('%257B'); // NOT double-encoded
		});

		it('decode handles single-encoded format (current)', () => {
			const query = initialQueriesMap.logs;
			const params = new URLSearchParams();
			params.set(COMPOSITE_QUERY_KEY, JSON.stringify(query));

			const decoded = jsonAdapter.decode(params);
			expect(decoded.builder.queryData[0].dataSource).toBe('logs');
		});
	});

	describe('legacy double-encoded fallback', () => {
		it('decode handles double-encoded format (legacy URLs)', () => {
			const query = initialQueriesMap.logs;
			// Simulate legacy: JSON -> encodeURIComponent -> set as raw param
			const doubleEncoded = encodeURIComponent(JSON.stringify(query));
			const params = new URLSearchParams();
			params.set(COMPOSITE_QUERY_KEY, doubleEncoded);

			const decoded = jsonAdapter.decode(params);
			expect(decoded.builder.queryData[0].dataSource).toBe('logs');
		});

		it('double-encoded with special chars decodes correctly', () => {
			const queryWithSpecialChars = {
				...initialQueriesMap.logs,
				builder: {
					...initialQueriesMap.logs.builder,
					queryData: [
						{
							...initialQueriesMap.logs.builder.queryData[0],
							filters: {
								op: 'AND',
								items: [
									{
										key: { key: 'message', dataType: 'string', type: 'tag' },
										op: '=',
										value: 'hello world & foo=bar',
									},
								],
							},
						},
					],
				},
			};
			const doubleEncoded = encodeURIComponent(
				JSON.stringify(queryWithSpecialChars),
			);
			const params = new URLSearchParams();
			params.set(COMPOSITE_QUERY_KEY, doubleEncoded);

			const decoded = jsonAdapter.decode(params);
			const filter = decoded.builder.queryData[0].filters?.items[0];
			expect(filter?.value).toBe('hello world & foo=bar');
		});
	});

	describe('plus-sign handling', () => {
		it('plus signs in double-encoded URLs decode as spaces', () => {
			// In URL encoding, + represents space. Legacy URLs may have this.
			const query = { queryType: 'builder', test: 'hello world' };
			// Manually create double-encoded with + for space
			const jsonStr = JSON.stringify(query);
			const encoded = encodeURIComponent(jsonStr).replace(/%20/g, '+');

			const params = new URLSearchParams();
			params.set(COMPOSITE_QUERY_KEY, encoded);

			const decoded = jsonAdapter.decode(params) as any;
			expect(decoded.test).toBe('hello world');
		});

		it('plus signs in filter values preserved after decode', () => {
			// Value literally contains + (not space)
			const queryWithPlus = {
				...initialQueriesMap.logs,
				builder: {
					...initialQueriesMap.logs.builder,
					queryData: [
						{
							...initialQueriesMap.logs.builder.queryData[0],
							filters: {
								op: 'AND',
								items: [
									{
										key: { key: 'expr', dataType: 'string', type: 'tag' },
										op: '=',
										value: '1+2=3',
									},
								],
							},
						},
					],
				},
			};

			// Current format (single encode) - + becomes %2B
			const params = jsonAdapter.encode(queryWithPlus as Query);
			const decoded = jsonAdapter.decode(params);
			expect(decoded.builder.queryData[0].filters?.items[0]?.value).toBe('1+2=3');
		});

		it('legacy double-encoded + in values preserved', () => {
			const queryWithPlus = {
				queryType: 'builder',
				builder: {
					queryData: [
						{
							dataSource: 'logs',
							queryName: 'A',
							filters: {
								op: 'AND',
								items: [{ key: { key: 'x' }, op: '=', value: 'a+b' }],
							},
						},
					],
					queryFormulas: [],
				},
				promql: [],
				clickhouse_sql: [],
				id: 'x',
				unit: '',
			};
			// Double encode: + in JSON becomes %2B, then %252B
			const doubleEncoded = encodeURIComponent(JSON.stringify(queryWithPlus));
			const params = new URLSearchParams();
			params.set(COMPOSITE_QUERY_KEY, doubleEncoded);

			const decoded = jsonAdapter.decode(params);
			expect(decoded.builder.queryData[0].filters?.items[0]?.value).toBe('a+b');
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
			params.set(COMPOSITE_QUERY_KEY, JSON.stringify(legacy));
			const decoded = jsonAdapter.decode(params);
			expect(decoded.builder.queryData[0].filter).toBeDefined();
			expect(decoded.builder.queryData[0].aggregations).toBeDefined();
		});
	});
});
