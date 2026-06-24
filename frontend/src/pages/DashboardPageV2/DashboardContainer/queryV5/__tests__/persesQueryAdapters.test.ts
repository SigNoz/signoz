import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { fromPerses, toPerses } from '../persesQueryAdapters';

/** A bare perses query (single plugin, not wrapped in a CompositeQuery). */
function bareQuery(
	pluginKind: string,
	spec: Record<string, unknown>,
): DashboardtypesQueryDTO {
	return {
		kind: 'scalar',
		spec: { plugin: { kind: pluginKind, spec } },
	} as unknown as DashboardtypesQueryDTO;
}

describe('persesQueryAdapters', () => {
	describe('fromPerses', () => {
		it('returns a fresh metrics builder query for an empty panel', () => {
			const query = fromPerses([], PANEL_TYPES.TIME_SERIES);
			expect(query.queryType).toBe(EQueryType.QUERY_BUILDER);
			expect(query.builder.queryData.length).toBeGreaterThan(0);
		});

		it('returns the metrics default when queries is empty', () => {
			expect(fromPerses([], PANEL_TYPES.TIME_SERIES)).toStrictEqual(
				initialQueriesMap[DataSource.METRICS],
			);
		});

		it('derives the PromQL query type from a promql plugin', () => {
			const queries = [
				bareQuery('signoz/PromQLQuery', {
					name: 'A',
					query: 'up',
					disabled: false,
				}),
			];
			expect(fromPerses(queries, PANEL_TYPES.TIME_SERIES).queryType).toBe(
				EQueryType.PROM,
			);
		});

		it('derives the ClickHouse query type from a clickhouse plugin', () => {
			const queries = [
				bareQuery('signoz/ClickHouseSQL', {
					name: 'A',
					query: 'SELECT 1',
					disabled: false,
				}),
			];
			expect(fromPerses(queries, PANEL_TYPES.TIME_SERIES).queryType).toBe(
				EQueryType.CLICKHOUSE,
			);
		});
	});

	describe('toPerses', () => {
		it('wraps the query in a single signoz/CompositeQuery keyed to the panel request type', () => {
			const result = toPerses(
				initialQueriesMap[DataSource.METRICS],
				PANEL_TYPES.TIME_SERIES,
			);

			expect(result).toHaveLength(1);
			expect(result[0].kind).toBe('time_series');
			expect(result[0].spec.plugin.kind).toBe('signoz/CompositeQuery');
		});

		it('maps a VALUE panel to the scalar request type', () => {
			const result = toPerses(
				initialQueriesMap[DataSource.METRICS],
				PANEL_TYPES.VALUE,
			);
			expect(result[0].kind).toBe('scalar');
		});

		it('emits a bare signoz/BuilderQuery for a List panel (not a CompositeQuery)', () => {
			const result = toPerses(
				initialQueriesMap[DataSource.LOGS],
				PANEL_TYPES.LIST,
			);

			expect(result).toHaveLength(1);
			expect(result[0].kind).toBe('raw');
			expect(result[0].spec.plugin.kind).toBe('signoz/BuilderQuery');
		});
	});

	describe('round-trip', () => {
		it('preserves a builder query through toPerses → fromPerses', () => {
			const original: Query = initialQueriesMap[DataSource.METRICS];

			const perses = toPerses(original, PANEL_TYPES.TIME_SERIES);
			const restored = fromPerses(perses, PANEL_TYPES.TIME_SERIES);

			expect(restored.queryType).toBe(EQueryType.QUERY_BUILDER);
			expect(restored.builder.queryData).toHaveLength(
				original.builder.queryData.length,
			);
			expect(restored.builder.queryData[0].dataSource).toBe(
				original.builder.queryData[0].dataSource,
			);
			expect(restored.builder.queryData[0].queryName).toBe(
				original.builder.queryData[0].queryName,
			);
		});

		it('preserves a List builder query through toPerses → fromPerses', () => {
			const original: Query = initialQueriesMap[DataSource.LOGS];

			const perses = toPerses(original, PANEL_TYPES.LIST);
			const restored = fromPerses(perses, PANEL_TYPES.LIST);

			expect(restored.queryType).toBe(EQueryType.QUERY_BUILDER);
			expect(restored.builder.queryData[0].dataSource).toBe(DataSource.LOGS);
		});
	});
});
