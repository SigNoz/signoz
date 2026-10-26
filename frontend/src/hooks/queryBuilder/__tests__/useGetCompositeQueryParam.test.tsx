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

describe('useGetCompositeQueryParam', () => {
	it.each(['[]', '"x"', '5', 'null', '{not json'])(
		'treats %s as no query',
		(raw) => {
			expect(renderOn(raw)).toBeNull();
		},
	);

	it('normalizes a query whose queryData is not an array', () => {
		const query = renderOn(
			JSON.stringify({
				...initialQueriesMap.logs,
				builder: { ...initialQueriesMap.logs.builder, queryData: { a: 1 } },
			}),
		);

		expect(query?.builder.queryData).toStrictEqual(
			initialQueryState.builder.queryData.map((item) => ({
				...item,
				having: { expression: '' },
			})),
		);
	});

	it('resets queryData holding null to the default query', () => {
		const query = renderOn(
			JSON.stringify({
				...initialQueriesMap.logs,
				builder: {
					...initialQueriesMap.logs.builder,
					queryData: [null, initialQueriesMap.logs.builder.queryData[0]],
				},
			}),
		);

		expect(query?.builder.queryData).toStrictEqual(
			initialQueryState.builder.queryData.map((item) => ({
				...item,
				having: { expression: '' },
			})),
		);
	});

	it('does not drop the query when having holds a non-object', () => {
		const query = renderOn(logsWith({ having: [null] }));

		expect(query?.builder.queryData[0].having).toStrictEqual({ expression: '' });
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

	it('applies the page constraints on the logs explorer route', () => {
		const query = renderOn(
			JSON.stringify({
				...initialQueriesMap.metrics,
				queryType: EQueryType.CLICKHOUSE,
			}),
			ROUTES.LOGS_EXPLORER,
		);

		expect(query?.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(query?.builder.queryData[0].dataSource).toBe(DataSource.LOGS);
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

	it('returns a valid query with only the legacy having converted', () => {
		const [item] = initialQueriesMap.logs.builder.queryData;

		expect(renderOn(JSON.stringify(initialQueriesMap.logs))).toStrictEqual({
			...initialQueriesMap.logs,
			builder: {
				...initialQueriesMap.logs.builder,
				queryData: [{ ...item, having: { expression: '' } }],
			},
		});
	});
});
