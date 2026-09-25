import {
	initialQueriesMap,
	initialQueryAIWithType,
} from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { act, AllTheProviders, renderHook } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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

describe('createNewBuilderQuery builderQueryType propagation', () => {
	it('carries builderQueryType from the first query onto an added query', () => {
		const { result } = renderQueryBuilder(initialQueryAIWithType);

		expect(
			result.current.currentQuery.builder.queryData[0].builderQueryType,
		).toBe('builder_ai_query');

		act(() => {
			result.current.addNewBuilderQuery();
		});

		expect(result.current.currentQuery.builder.queryData).toHaveLength(2);
		expect(
			result.current.currentQuery.builder.queryData[1].builderQueryType,
		).toBe('builder_ai_query');
	});

	it('leaves builderQueryType unset when the first query has none', () => {
		const { result } = renderQueryBuilder(initialQueriesMap.traces);

		act(() => {
			result.current.addNewBuilderQuery();
		});

		expect(result.current.currentQuery.builder.queryData).toHaveLength(2);
		expect(
			result.current.currentQuery.builder.queryData[1].builderQueryType,
		).toBeUndefined();
	});
});
