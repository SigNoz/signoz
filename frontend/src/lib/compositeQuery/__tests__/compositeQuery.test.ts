import { initialQueriesMap, initialQueryState } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import {
	parseCompositeQueryParam,
	serializeCompositeQueryParam,
} from '../compositeQuerySerialization';
import { migrateCompositeQuery } from '../migrateCompositeQuery';
import { normalizeCompositeQuery } from '../normalizeCompositeQuery';

const legacyLogsQuery: Query = {
	...initialQueriesMap.logs,
	builder: {
		...initialQueriesMap.logs.builder,
		queryData: [
			{
				...initialQueriesMap.logs.builder.queryData[0],
				aggregations: undefined,
				aggregateOperator: 'count',
				filter: undefined,
				filters: {
					items: [
						{
							id: 'service-name-filter',
							key: {
								id: 'service.name',
								key: 'service.name',
								dataType: DataTypes.String,
								type: 'tag',
							},
							op: '=',
							value: 'frontend',
						},
					],
					op: 'AND',
				},
				having: [{ columnName: 'count()', op: '>', value: 100 }],
			},
		],
	},
};

describe('migrateCompositeQuery', () => {
	it('converts legacy filters array to filter expression', () => {
		const migrated = migrateCompositeQuery(legacyLogsQuery);

		const { filter } = migrated.builder.queryData[0];
		expect(filter?.expression).toContain('service.name');
		expect(filter?.expression).toContain('frontend');
	});

	it('converts legacy having array to having expression', () => {
		const migrated = migrateCompositeQuery(legacyLogsQuery);

		expect(migrated.builder.queryData[0].having).toStrictEqual({
			expression: 'count() > 100',
		});
	});

	it('converts legacy aggregateOperator to aggregations', () => {
		const migrated = migrateCompositeQuery(legacyLogsQuery);

		expect(migrated.builder.queryData[0].aggregations).toStrictEqual([
			{ expression: 'count()' },
		]);
	});

	it('keeps existing aggregations and filter expression untouched', () => {
		const newFormatQuery: Query = {
			...initialQueriesMap.logs,
			builder: {
				...initialQueriesMap.logs.builder,
				queryData: [
					{
						...initialQueriesMap.logs.builder.queryData[0],
						filter: { expression: "severity_text = 'ERROR'" },
					},
				],
			},
		};

		const migrated = migrateCompositeQuery(newFormatQuery);

		expect(migrated.builder.queryData[0].aggregations).toStrictEqual(
			newFormatQuery.builder.queryData[0].aggregations,
		);
		expect(migrated.builder.queryData[0].filter?.expression).toBe(
			"severity_text = 'ERROR'",
		);
	});

	it('returns the query as is when builder queryData is missing', () => {
		const queryWithoutBuilder = {
			queryType: EQueryType.PROM,
		} as unknown as Query;

		expect(migrateCompositeQuery(queryWithoutBuilder)).toBe(queryWithoutBuilder);
	});
});

describe('parseCompositeQueryParam / serializeCompositeQueryParam', () => {
	it('round-trips a composite query through serialize and parse', () => {
		const query: Query = {
			...initialQueriesMap.logs,
			builder: {
				...initialQueriesMap.logs.builder,
				queryData: [
					{
						...initialQueriesMap.logs.builder.queryData[0],
						filter: { expression: "key1 = 'a+b' AND key2 = 'c d'" },
					},
				],
			},
		};

		const parsed = parseCompositeQueryParam(serializeCompositeQueryParam(query));

		expect(parsed?.id).toBe(query.id);
		expect(parsed?.queryType).toBe(query.queryType);
		expect(parsed?.builder.queryData[0].filter?.expression).toBe(
			"key1 = 'a+b' AND key2 = 'c d'",
		);
	});

	it('treats literal + characters as spaces (legacy URL encoding)', () => {
		const serialized = serializeCompositeQueryParam(initialQueriesMap.logs);
		const legacyEncoded = serialized.replace(/%20/g, '+');

		const parsed = parseCompositeQueryParam(legacyEncoded);

		expect(parsed?.id).toBe(initialQueriesMap.logs.id);
	});

	it('returns null for missing or unparseable values', () => {
		expect(parseCompositeQueryParam(null)).toBeNull();
		expect(parseCompositeQueryParam('')).toBeNull();
		expect(parseCompositeQueryParam('not-a-json')).toBeNull();
	});
});

describe('normalizeCompositeQuery', () => {
	it('fills defaults for an empty partial query', () => {
		const normalized = normalizeCompositeQuery({});

		expect(normalized.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(normalized.builder).toBe(initialQueryState.builder);
		expect(normalized.promql).toBe(initialQueryState.promql);
		expect(normalized.clickhouse_sql).toBe(initialQueryState.clickhouse_sql);
		expect(normalized.unit).toBe(initialQueryState.unit);
	});

	it('falls back to QUERY_BUILDER for an invalid queryType', () => {
		const normalized = normalizeCompositeQuery({
			queryType: 'bogus' as unknown as EQueryType,
		});

		expect(normalized.queryType).toBe(EQueryType.QUERY_BUILDER);
	});

	it('falls back to defaults for empty builder, promql and clickhouse queries', () => {
		const normalized = normalizeCompositeQuery({
			builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			promql: [],
			clickhouse_sql: [],
		});

		expect(normalized.builder).toBe(initialQueryState.builder);
		expect(normalized.promql).toBe(initialQueryState.promql);
		expect(normalized.clickhouse_sql).toBe(initialQueryState.clickhouse_sql);
	});

	it('preserves provided values and stamps a fresh id on every call', () => {
		const query = initialQueriesMap.logs;

		const first = normalizeCompositeQuery(query);
		const second = normalizeCompositeQuery(query);

		expect(first.queryType).toBe(query.queryType);
		expect(first.builder).toBe(query.builder);
		expect(first.id).not.toBe(query.id);
		expect(first.id).not.toBe(second.id);
	});
});
