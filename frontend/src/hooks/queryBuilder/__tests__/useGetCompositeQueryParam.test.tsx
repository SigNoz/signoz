import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, initialQueryState } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { AllTheProviders, renderHook } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

const UNCONSTRAINED_ROUTE = '/unconstrained';

const renderOn = (
	compositeQuery: string,
	route: string = UNCONSTRAINED_ROUTE,
): Query | null => {
	const search = new URLSearchParams();
	search.set('compositeQuery', compositeQuery);

	const { result } = renderHook(() => useGetCompositeQueryParam(), {
		wrapper: ({ children }): JSX.Element => (
			<AllTheProviders initialRoute={`${route}?${search}`}>
				{children}
			</AllTheProviders>
		),
	});

	return result.current;
};

const logsWith = (item: object): string =>
	JSON.stringify({
		...initialQueriesMap.logs,
		builder: {
			...initialQueriesMap.logs.builder,
			queryData: [{ ...initialQueriesMap.logs.builder.queryData[0], ...item }],
		},
	});

const withHavingConverted = (queryData: object[]): object[] =>
	queryData.map((item) => ({ ...item, having: { expression: '' } }));

describe('useGetCompositeQueryParam', () => {
	it('treats a non-object or broken compositeQuery as no query', () => {
		['[]', '"x"', '5', 'null', '{not json'].forEach((raw) =>
			expect(renderOn(raw)).toBeNull(),
		);
	});

	it('repairs the builder shape and converts the legacy having', () => {
		const defaultQueryData = withHavingConverted(
			initialQueryState.builder.queryData,
		);
		[{ a: 1 }, [null, initialQueriesMap.logs.builder.queryData[0]]].forEach(
			(queryData) =>
				expect(
					renderOn(
						JSON.stringify({
							...initialQueriesMap.logs,
							builder: { ...initialQueriesMap.logs.builder, queryData },
						}),
					)?.builder.queryData,
				).toStrictEqual(defaultQueryData),
		);

		expect(
			renderOn(logsWith({ having: [null] }))?.builder.queryData[0].having,
		).toStrictEqual({ expression: '' });
		expect(renderOn(JSON.stringify(initialQueriesMap.logs))).toStrictEqual({
			...initialQueriesMap.logs,
			builder: {
				...initialQueriesMap.logs.builder,
				queryData: withHavingConverted(initialQueriesMap.logs.builder.queryData),
			},
		});
	});

	it('gives an id-less query with a filter the same id on every parse', () => {
		const { id: _, ...withoutId } = JSON.parse(
			logsWith({ filter: { expression: "service.name='x'" } }),
		);
		const first = renderOn(JSON.stringify(withoutId));
		const again = renderOn(JSON.stringify(withoutId));
		const other = renderOn(
			JSON.stringify({ ...withoutId, queryType: EQueryType.PROM }),
		);

		expect(first?.id).toHaveLength(36);
		expect(again?.id).toBe(first?.id);
		expect(other?.id).not.toBe(first?.id);
	});

	it('applies the page constraints on every constrained route', () => {
		const clickhouseWithOperator = JSON.stringify({
			...initialQueriesMap.logs,
			queryType: EQueryType.CLICKHOUSE,
			builder: {
				...initialQueriesMap.logs.builder,
				queryData: [
					{
						...initialQueriesMap.metrics.builder.queryData[0],
						source: TelemetrytypesSourceDTO.meter,
					},
				],
				queryTraceOperator: [initialQueriesMap.traces.builder.queryData[0]],
			},
		});

		[
			[ROUTES.LOGS_EXPLORER, DataSource.LOGS, ''],
			[ROUTES.AI_OBSERVABILITY_EXPLORER, DataSource.TRACES, ''],
			[ROUTES.METRICS_EXPLORER_EXPLORER, DataSource.METRICS, ''],
			[ROUTES.METER_EXPLORER, DataSource.METRICS, TelemetrytypesSourceDTO.meter],
		].forEach(([route, dataSource, source]) => {
			const query = renderOn(clickhouseWithOperator, route);

			expect(query?.queryType).toBe(EQueryType.QUERY_BUILDER);
			expect(query?.builder.queryData[0].dataSource).toBe(dataSource);
			expect(query?.builder.queryData[0].source ?? '').toBe(source);
			expect(query?.builder.queryTraceOperator).toStrictEqual([]);
		});
	});

	it('keeps the query type on a route without constraints', () => {
		const query = renderOn(
			JSON.stringify({
				...initialQueriesMap.metrics,
				queryType: EQueryType.CLICKHOUSE,
			}),
		);

		expect(query?.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(query?.builder.queryData[0].dataSource).toBe(DataSource.METRICS);
	});
});
