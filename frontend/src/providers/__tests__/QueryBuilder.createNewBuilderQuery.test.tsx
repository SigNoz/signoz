import {
	initialQueriesMap,
	initialQueryAIWithType,
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { act, AllTheProviders, renderHook } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

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

describe('createNewBuilderQuery data source', () => {
	it.each([DataSource.LOGS, DataSource.TRACES, DataSource.METRICS])(
		'continues the previous %s query when the host fixes no data source',
		(dataSource) => {
			const { result } = renderQueryBuilder(initialQueriesMap[dataSource]);

			act(() => {
				result.current.addNewBuilderQuery();
			});

			const [, added] = result.current.currentQuery.builder.queryData;
			expect(added.dataSource).toBe(dataSource);
			expect(added.aggregations).toStrictEqual(
				initialQueryBuilderFormValuesMap[dataSource].aggregations,
			);
		},
	);

	it('follows the last query when queries mix signals', () => {
		const { result } = renderQueryBuilder(initialQueriesMap.logs);
		act(() => {
			result.current.addNewBuilderQuery();
		});
		act(() => {
			result.current.handleSetQueryData(1, {
				...initialQueryBuilderFormValuesMap.traces,
				queryName: 'B',
				expression: 'B',
			});
		});

		act(() => {
			result.current.addNewBuilderQuery();
		});

		expect(result.current.currentQuery.builder.queryData[2].dataSource).toBe(
			DataSource.TRACES,
		);
	});

	it('keeps the meter source of a previous meter query', () => {
		const meterQuery: Query = {
			...initialQueriesMap.metrics,
			builder: {
				...initialQueriesMap.metrics.builder,
				queryData: [
					{ ...initialQueriesMap.metrics.builder.queryData[0], source: 'meter' },
				],
			},
		};
		const { result } = renderQueryBuilder(meterQuery);

		act(() => {
			result.current.addNewBuilderQuery();
		});

		expect(result.current.currentQuery.builder.queryData[1]).toMatchObject({
			dataSource: DataSource.METRICS,
			source: 'meter',
		});
	});

	it('uses the host’s fixed data source over the previous query', () => {
		const { result } = renderQueryBuilder(initialQueriesMap.metrics);
		act(() => {
			result.current.handleSetConfig(PANEL_TYPES.TIME_SERIES, DataSource.LOGS);
		});

		act(() => {
			result.current.addNewBuilderQuery();
		});

		expect(result.current.currentQuery.builder.queryData[1].dataSource).toBe(
			DataSource.LOGS,
		);
	});
});
