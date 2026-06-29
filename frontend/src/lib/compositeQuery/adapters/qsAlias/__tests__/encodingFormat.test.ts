import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { qsAliasAdapter } from '../index';

const STABLE_ID = 'test-stable-id';

const clone = (query: Query): Query =>
	JSON.parse(JSON.stringify(query)) as Query;

const normalizeId = (query: Query): Query => ({ ...query, id: STABLE_ID });

const normalizeUrl = (url: string): string =>
	url.replace(/id=[^&]+/, `id=${STABLE_ID}`);

describe('qsAliasAdapter encoding format', () => {
	describe('prefix substitution', () => {
		it('rewrites builder.queryData.0 to the query0 prefix', () => {
			const query = clone(initialQueriesMap.traces);
			query.builder.queryData[0].aggregateOperator = 'count';

			const encoded = qsAliasAdapter.encode(query);
			const keys = Array.from(encoded.keys());

			expect(keys.some((k) => k.startsWith('query0.'))).toBe(true);
			expect(keys.some((k) => k.includes('queryData'))).toBe(false);
			expect(keys.some((k) => k.includes('builder'))).toBe(false);
			expect(normalizeUrl(encoded.toString())).toMatchSnapshot('url');
		});
	});

	describe('field aliasing', () => {
		it('emits the short alias instead of the full field name', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData[0].aggregateOperator = 'sum';

			const wire = qsAliasAdapter.encode(query).toString();

			expect(wire).toContain('query0.aggOp=');
			expect(wire).not.toContain('aggregateOperator');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
		});
	});

	describe('stability', () => {
		it('re-encoding after a decode is byte-identical', () => {
			const encoded1 = qsAliasAdapter.encode(initialQueriesMap.metrics);
			const encoded2 = qsAliasAdapter.encode(qsAliasAdapter.decode(encoded1));
			expect(encoded2.toString()).toBe(encoded1.toString());
			expect(normalizeUrl(encoded1.toString())).toMatchSnapshot('url');
			expect(normalizeId(qsAliasAdapter.decode(encoded1))).toMatchSnapshot(
				'decoded',
			);
		});

		it('is independent of source key order', () => {
			const query1 = initialQueriesMap.metrics;
			const query2 = JSON.parse(JSON.stringify(query1)) as Query;
			const reordered = {
				unit: query2.unit,
				id: query2.id,
				queryType: query2.queryType,
				clickhouse_sql: query2.clickhouse_sql,
				promql: query2.promql,
				builder: query2.builder,
			} as Query;

			const wire1 = qsAliasAdapter.encode(query1).toString();
			const wire2 = qsAliasAdapter.encode(reordered).toString();
			expect(wire2).toBe(wire1);
			expect(normalizeUrl(wire1)).toMatchSnapshot('url');
		});

		it('is stable after spread / reconstruct', () => {
			const query = { ...initialQueriesMap.metrics };
			const transformed = {
				...query,
				builder: {
					...query.builder,
					queryData: query.builder.queryData.map((item) => ({ ...item })),
				},
			};

			const wire = qsAliasAdapter.encode(transformed).toString();
			expect(wire).toBe(qsAliasAdapter.encode(query).toString());
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
		});
	});
});
