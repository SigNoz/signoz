import {
	initialQueriesMap,
	initialQueryAIWithType,
} from 'constants/queryBuilder';
import {
	getActiveBuilder,
	getBuilderSlotKey,
	isBuilderQueryType,
	toAISlotQuery,
	toWireQuery,
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

describe('getBuilderSlotKey', () => {
	it.each([
		[EQueryType.QUERY_BUILDER, 'builder'],
		[EQueryType.CLICKHOUSE, 'builder'],
		[EQueryType.PROM, 'builder'],
		[EQueryType.AI_QUERY_BUILDER, 'builder_ai_query'],
	])('maps %s to %s', (queryType, slot) => {
		expect(getBuilderSlotKey(queryType)).toBe(slot);
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

describe('toWireQuery', () => {
	it('passes non-AI queries through untouched', () => {
		expect(toWireQuery(baseQuery)).toBe(baseQuery);
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

		const wire = toWireQuery(query);

		expect(wire.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(wire.builder.queryData).toStrictEqual([
			{ ...untagged, builderQueryType: 'builder_ai_query' },
		]);
	});
});

describe('toAISlotQuery', () => {
	const wireQuery = toWireQuery({
		...baseQuery,
		queryType: EQueryType.AI_QUERY_BUILDER,
		builder_ai_query: aiBuilder,
	});

	it('moves a builder query into the AI slot under the AI type, tags kept', () => {
		const result = toAISlotQuery(wireQuery);

		expect(result.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(result.builder.queryData).toHaveLength(0);
		expect(result.builder_ai_query?.queryData[0]).toMatchObject({
			queryName: 'A',
			builderQueryType: 'builder_ai_query',
		});
	});

	it('round-trips with toWireQuery', () => {
		expect(toWireQuery(toAISlotQuery(wireQuery))).toStrictEqual(wireQuery);
	});

	it('leaves ClickHouse, PromQL and AI-typed queries untouched', () => {
		const promql: Query = { ...baseQuery, queryType: EQueryType.PROM };
		const aiTyped: Query = {
			...baseQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
			builder_ai_query: aiBuilder,
		};

		expect(toAISlotQuery(promql)).toBe(promql);
		expect(toAISlotQuery(aiTyped)).toBe(aiTyped);
	});
});
