import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import {
	IBuilderFormula,
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { qsAliasAdapter } from '../index';

const STABLE_ID = 'test-stable-id';

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;

const normalizeId = (query: Query): Query => ({ ...query, id: STABLE_ID });

const normalizeUrl = (url: string): string =>
	url.replace(/id=[^&]+/, `id=${STABLE_ID}`);

const roundTrip = (query: Query): Query =>
	qsAliasAdapter.decode(qsAliasAdapter.encode(query));

const makeSecondBuilderQuery = (name: string): IBuilderQuery => ({
	...clone(initialQueryBuilderFormValuesMap.metrics),
	queryName: name,
	aggregateOperator: 'avg',
	legend: `${name} legend`,
});

const makeFormula = (name: string, expression: string): IBuilderFormula => ({
	queryName: name,
	expression,
	disabled: false,
	legend: `${name} result`,
});

describe('qsAliasAdapter multi-queryData', () => {
	describe('multiple builder queries', () => {
		it('round-trips two queryData entries (A + B)', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips three queryData entries (A + B + C)', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));
			query.builder.queryData.push(makeSecondBuilderQuery('C'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('formula queries', () => {
		it('round-trips single formula F1 = A/B', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));
			query.builder.queryFormulas.push(makeFormula('F1', 'A/B'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips multiple formulas F1 + F2', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));
			query.builder.queryData.push(makeSecondBuilderQuery('C'));
			query.builder.queryFormulas.push(makeFormula('F1', 'A/B'));
			query.builder.queryFormulas.push(makeFormula('F2', 'A*100/C'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips formula with complex expression', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));
			query.builder.queryFormulas.push(makeFormula('F1', '(A - B) / B * 100'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('multiple clickhouse queries', () => {
		it('round-trips two clickhouse_sql entries', () => {
			const query = clone(initialQueriesMap.metrics);
			query.queryType = EQueryType.CLICKHOUSE;
			query.clickhouse_sql[0].query =
				'SELECT count() FROM logs WHERE severity > 0';
			query.clickhouse_sql.push({
				name: 'B',
				legend: 'total',
				disabled: false,
				query: 'SELECT count() FROM logs',
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips three clickhouse_sql entries with mixed disabled states', () => {
			const query = clone(initialQueriesMap.metrics);
			query.queryType = EQueryType.CLICKHOUSE;
			query.clickhouse_sql[0].query = 'SELECT 1';
			query.clickhouse_sql.push({
				name: 'B',
				legend: 'second',
				disabled: true,
				query: 'SELECT 2',
			});
			query.clickhouse_sql.push({
				name: 'C',
				legend: '',
				disabled: false,
				query: 'SELECT 3',
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('multiple promql queries', () => {
		it('round-trips two promql entries', () => {
			const query = clone(initialQueriesMap.metrics);
			query.queryType = EQueryType.PROM;
			query.promql[0].query = 'rate(http_requests_total[5m])';
			query.promql.push({
				name: 'B',
				legend: 'errors',
				disabled: false,
				query: 'rate(http_errors_total[5m])',
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips three promql entries', () => {
			const query = clone(initialQueriesMap.metrics);
			query.queryType = EQueryType.PROM;
			query.promql[0].query = 'metric_a';
			query.promql.push({
				name: 'B',
				legend: 'b-legend',
				disabled: false,
				query: 'metric_b',
			});
			query.promql.push({
				name: 'C',
				legend: '',
				disabled: true,
				query: 'metric_c',
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('mixed data sources within builder', () => {
		it('round-trips logs queryData with formulas', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData.push({
				...clone(initialQueryBuilderFormValuesMap.logs),
				queryName: 'B',
				aggregateOperator: 'count_distinct',
			});
			query.builder.queryFormulas.push(makeFormula('F1', 'A/B'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips traces queryData with formulas', () => {
			const query = clone(initialQueriesMap.traces);
			query.builder.queryData.push({
				...clone(initialQueryBuilderFormValuesMap.traces),
				queryName: 'B',
				aggregateOperator: 'p99',
			});
			query.builder.queryFormulas.push(makeFormula('F1', 'B - A'));

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('wire format verification', () => {
		it('encodes multiple queryData with indexed keys', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));

			const wire = qsAliasAdapter.encode(query).toString();

			expect(wire).toContain('query0.');
			expect(wire).toContain('query1.');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
		});

		it('encodes formulas with formula-prefixed keys', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push(makeSecondBuilderQuery('B'));
			query.builder.queryFormulas.push(makeFormula('F1', 'A/B'));

			const wire = qsAliasAdapter.encode(query).toString();

			expect(query.builder.queryFormulas).toHaveLength(1);
			expect(query.builder.queryFormulas[0].queryName).toBe('F1');
			expect(wire).toContain('formula0.');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
		});

		it('encodes clickhouse with chsql-prefixed keys', () => {
			const query = clone(initialQueriesMap.metrics);
			query.queryType = EQueryType.CLICKHOUSE;
			query.clickhouse_sql.push({
				name: 'B',
				legend: '',
				disabled: false,
				query: 'SELECT 1',
			});

			const wire = qsAliasAdapter.encode(query).toString();

			expect(wire).toContain('chsql1.');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
		});

		it('encodes promql with promql-prefixed keys', () => {
			const query = clone(initialQueriesMap.metrics);
			query.queryType = EQueryType.PROM;
			query.promql.push({
				name: 'B',
				legend: '',
				disabled: false,
				query: 'metric_b',
			});

			const wire = qsAliasAdapter.encode(query).toString();

			expect(wire).toContain('promql1.');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
		});
	});

	describe('template diffing optimization', () => {
		it('added queryData only emits changed fields vs baseline[0]', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push({
				...clone(query.builder.queryData[0]),
				queryName: 'B',
				aggregateOperator: 'avg',
				legend: 'B query',
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			const params = new URLSearchParams(wire);
			const query1Params = Array.from(params.keys()).filter((k) =>
				k.startsWith('query1.'),
			);

			// Should have ~4-5 params (qn, aggOp, legend, source), not ~25
			expect(query1Params.length).toBeLessThan(10);

			// Should NOT have unchanged fields
			expect(wire).not.toContain('query1.filters.op');
			expect(wire).not.toContain('query1.groupBy');
			expect(wire).not.toContain('query1.having');

			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('decoder correctly reconstructs from template-diffed wire', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryData.push({
				...clone(query.builder.queryData[0]),
				queryName: 'B',
				aggregateOperator: 'avg',
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			// Wire should be compact
			expect(wire).not.toContain('query1.filters.op');

			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('works for queryFormulas with template inheritance', () => {
			const query = clone(initialQueriesMap.metrics);
			query.builder.queryFormulas.push(makeFormula('F1', 'A'));
			query.builder.queryFormulas.push({
				...makeFormula('F2', 'B'),
				disabled: true,
			});

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			const params = new URLSearchParams(wire);
			const f1Params = Array.from(params.keys()).filter((k) =>
				k.startsWith('formula0.'),
			);
			const f2Params = Array.from(params.keys()).filter((k) =>
				k.startsWith('formula1.'),
			);

			// F2 should be smaller or equal (diffs against F1)
			expect(f2Params.length).toBeLessThanOrEqual(f1Params.length);

			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});
});
