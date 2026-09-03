import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';

import { getTableColumnKeys } from '../getTableColumnKeys';

function bareBuilderQuery(spec: unknown): DashboardtypesQueryDTO {
	return {
		spec: { plugin: { kind: 'signoz/BuilderQuery', spec } },
	} as unknown as DashboardtypesQueryDTO;
}

function compositeQuery(envelopes: unknown[]): DashboardtypesQueryDTO {
	return {
		spec: {
			plugin: { kind: 'signoz/CompositeQuery', spec: { queries: envelopes } },
		},
	} as unknown as DashboardtypesQueryDTO;
}

describe('getTableColumnKeys', () => {
	it('keys single-aggregation queries by name and multi-aggregation ones per expression (matches getColId)', () => {
		const queries = [
			compositeQuery([
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						aggregations: [{ expression: 'count()' }, { expression: 'sum(bytes)' }],
					},
				},
				{
					type: 'builder_query',
					spec: { name: 'B', aggregations: [{ expression: 'count()' }] },
				},
			]),
		];
		expect(getTableColumnKeys(queries)).toStrictEqual([
			'A.count()',
			'A.sum(bytes)',
			'B',
		]);
	});

	it('skips disabled queries', () => {
		const queries = [
			compositeQuery([
				{ type: 'builder_query', spec: { name: 'A', disabled: true } },
				{ type: 'builder_query', spec: { name: 'B' } },
			]),
		];
		expect(getTableColumnKeys(queries)).toStrictEqual(['B']);
	});

	it('keys non-builder envelopes by name but skips clickhouse_sql (columns keyed by unknown SQL alias)', () => {
		const queries = [
			compositeQuery([
				{ type: 'builder_formula', spec: { name: 'F1', expression: 'A * 2' } },
				{ type: 'clickhouse_sql', spec: { name: 'CH1', query: 'SELECT 1' } },
			]),
		];
		expect(getTableColumnKeys(queries)).toStrictEqual(['F1']);
	});

	it('reads a bare builder-query envelope', () => {
		expect(getTableColumnKeys([bareBuilderQuery({ name: 'A' })])).toStrictEqual([
			'A',
		]);
	});

	it('returns no keys when there is no enabled named query', () => {
		expect(getTableColumnKeys([])).toStrictEqual([]);
		expect(
			getTableColumnKeys([
				compositeQuery([
					{ type: 'builder_query', spec: { name: 'A', disabled: true } },
				]),
			]),
		).toStrictEqual([]);
	});
});
