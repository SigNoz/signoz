import {
	initialQueriesMap,
	initialQueryAIWithType,
} from 'constants/queryBuilder';
import {
	getActiveBuilder,
	getBuilderSlotKeyForQueryType,
	isAIQueryType,
	isBuilderQueryType,
	toRequestQuery,
	toSlotQuery,
} from 'lib/query/builderSlot';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

const baseQuery = initialQueriesMap[DataSource.METRICS];
const aiBuilder = initialQueryAIWithType.builder;

describe('isBuilderQueryType', () => {
	it.each([
		[EQueryType.QUERY_BUILDER, true],
		[EQueryType.AI_QUERY_BUILDER, true],
		[EQueryType.CLICKHOUSE, false],
		[EQueryType.PROM, false],
	])('%s → %s', (queryType, expected) => {
		expect(isBuilderQueryType(queryType)).toBe(expected);
	});
});

describe('getBuilderSlotKeyForQueryType', () => {
	it.each([
		[EQueryType.QUERY_BUILDER, EQueryType.QUERY_BUILDER],
		[EQueryType.CLICKHOUSE, EQueryType.QUERY_BUILDER],
		[EQueryType.PROM, EQueryType.QUERY_BUILDER],
		[EQueryType.AI_QUERY_BUILDER, EQueryType.AI_QUERY_BUILDER],
	])('maps %s to %s', (queryType, slotKey) => {
		expect(getBuilderSlotKeyForQueryType(queryType)).toBe(slotKey);
	});
});

describe('getActiveBuilder', () => {
	it('reads builder for the Query Builder type', () => {
		const query: Query = { ...baseQuery, builder_ai_query: aiBuilder };
		expect(getActiveBuilder(query)).toBe(baseQuery.builder);
	});

	it('reads the AI slot for the AI type', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
			builder_ai_query: aiBuilder,
		};
		expect(getActiveBuilder(query)).toBe(aiBuilder);
	});

	it('reads an unused AI slot as holding no queries', () => {
		const query: Query = { ...baseQuery, queryType: EQueryType.AI_QUERY_BUILDER };
		expect(getActiveBuilder(query)).toStrictEqual({
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		});
	});

	it('keeps builder for ClickHouse and PromQL', () => {
		const query: Query = { ...baseQuery, queryType: EQueryType.PROM };
		expect(getActiveBuilder(query)).toBe(baseQuery.builder);
	});
});

describe('toRequestQuery', () => {
	it('passes non-AI queries through untouched', () => {
		expect(toRequestQuery(baseQuery)).toBe(baseQuery);
	});

	it('sends AI as a builder query holding the AI slot, every query tagged', () => {
		const untagged = {
			...aiBuilder.queryData[0],
			builderQueryType: undefined,
		};
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
			builder_ai_query: { ...aiBuilder, queryData: [untagged] },
		};

		const requestQuery = toRequestQuery(query);

		expect(requestQuery.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(requestQuery.builder.queryData).toStrictEqual([
			{ ...untagged, builderQueryType: 'builder_ai_query' },
		]);
	});
});

describe('isAIQueryType', () => {
	it.each([
		[EQueryType.AI_QUERY_BUILDER, true],
		[EQueryType.QUERY_BUILDER, false],
		[EQueryType.CLICKHOUSE, false],
		[EQueryType.PROM, false],
	])('%s → %s', (queryType, expected) => {
		expect(isAIQueryType(queryType)).toBe(expected);
	});
});

describe('toSlotQuery', () => {
	it('returns non-AI queries unchanged', () => {
		expect(toSlotQuery(baseQuery, baseQuery)).toBe(baseQuery);
	});

	it('moves request-shape builder edits back into the AI slot', () => {
		const slotQuery: Query = {
			...baseQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
			builder_ai_query: aiBuilder,
		};
		const requestQuery = toRequestQuery(slotQuery);
		const refined: Query = {
			...requestQuery,
			builder: { ...requestQuery.builder, queryFormulas: [] },
		};

		const restored = toSlotQuery(refined, slotQuery);

		expect(restored.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(restored.builder).toBe(baseQuery.builder);
		expect(restored.builder_ai_query).toBe(refined.builder);
	});
});
