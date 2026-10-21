import {
	initialQueriesMap,
	initialQueryAIWithType,
} from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { act, AllTheProviders, renderHook } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

const renderQueryBuilder = (
	initialQuery: Query,
): ReturnType<
	typeof renderHook<ReturnType<typeof useQueryBuilder>, unknown>
> => {
	const hook = renderHook(() => useQueryBuilder(), {
		wrapper: AllTheProviders,
	});

	act(() => {
		hook.result.current.initQueryBuilderData(initialQuery);
	});

	return hook;
};

const aiQuery: Query = {
	...initialQueriesMap.metrics,
	queryType: EQueryType.AI_QUERY_BUILDER,
	builder_ai_query: initialQueryAIWithType.builder,
};

describe('QueryBuilder AI slot', () => {
	it('leaves the AI slot absent for a query that never used it', () => {
		const { result } = renderQueryBuilder(initialQueriesMap.metrics);

		expect(result.current.currentQuery).not.toHaveProperty('builder_ai_query');
	});

	it('fills an unused AI slot when AI becomes the query type', () => {
		const { result } = renderQueryBuilder({
			...initialQueriesMap.metrics,
			queryType: EQueryType.AI_QUERY_BUILDER,
		});

		expect(
			result.current.currentQuery.builder_ai_query?.queryData[0],
		).toMatchObject({
			dataSource: 'traces',
			builderQueryType: 'builder_ai_query',
		});
	});

	it('edits the AI slot and leaves builder alone while AI is active', () => {
		const { result } = renderQueryBuilder(aiQuery);
		const { builder } = result.current.currentQuery;

		act(() => {
			result.current.addNewBuilderQuery();
		});
		act(() => {
			result.current.handleSetQueryData(0, {
				...initialQueryAIWithType.builder.queryData[0],
				legend: 'ai legend',
			});
		});

		const { currentQuery } = result.current;
		expect(currentQuery.builder).toStrictEqual(builder);
		expect(currentQuery.builder_ai_query?.queryData).toHaveLength(2);
		expect(currentQuery.builder_ai_query?.queryData[0].legend).toBe('ai legend');
	});

	it('edits builder and keeps the AI slot while Query Builder is active', () => {
		const { result } = renderQueryBuilder({
			...aiQuery,
			queryType: EQueryType.QUERY_BUILDER,
		});
		const aiBuilder = result.current.currentQuery.builder_ai_query;

		act(() => {
			result.current.addNewBuilderQuery();
		});

		expect(result.current.currentQuery.builder.queryData).toHaveLength(2);
		expect(result.current.currentQuery.builder_ai_query).toStrictEqual(aiBuilder);
	});
});
