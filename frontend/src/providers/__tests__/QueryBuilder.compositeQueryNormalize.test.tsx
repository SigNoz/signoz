import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	act,
	AllTheProviders,
	renderHook,
	RenderHookResult,
	waitFor,
} from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

jest.mock('hooks/useSafeNavigate', () => {
	const { navigate } = jest.requireActual('lib/router/navigation');
	return {
		useSafeNavigate: (): unknown => ({
			safeNavigate: (to: string, opts?: { replace?: boolean }): void => {
				navigate(to, { replace: opts?.replace });
			},
		}),
	};
});

const builderlessUrlQuery = {
	queryType: 'clickhouse_sql',
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	id: 'b8084e0c-c13d-4172-a775-f61aedadb79e',
	unit: '',
};

const clickhouseUrlQuery = {
	...builderlessUrlQuery,
	clickhouse_sql: [
		{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
	],
};

const tracesWithOperator = {
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryTraceOperator: [initialQueriesMap.traces.builder.queryData[0]],
	},
};

const urlQuery = (): Query =>
	JSON.parse(
		decodeURIComponent(
			new URLSearchParams(window.location.search).get('compositeQuery') ?? '',
		),
	);

const activeLogIdParam = (): string | null =>
	new URLSearchParams(window.location.search).get('activeLogId');

const renderOn = (
	route: string,
	compositeQuery: object,
	params: Record<string, string> = {},
): RenderHookResult<QueryBuilderContextType, unknown> => {
	const search = new URLSearchParams(params);
	search.set('compositeQuery', JSON.stringify(compositeQuery));
	const url = `${route}?${search}`;
	window.history.replaceState(null, '', url);

	return renderHook(() => useQueryBuilder(), {
		wrapper: ({ children }): JSX.Element => (
			<AllTheProviders initialRoute={url}>{children}</AllTheProviders>
		),
	});
};

describe('QueryBuilderProvider on a url compositeQuery without builder', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('seeds supersetQuery with a builder so the first edit does not throw', () => {
		const { result } = renderOn(ROUTES.LOGS_EXPLORER, builderlessUrlQuery);

		expect(result.current.supersetQuery.builder).toBeDefined();

		act(() => {
			result.current.handleSetQueryData(0, {
				...initialQueryBuilderFormValuesMap.logs,
				limit: 10,
			});
		});

		expect(result.current.supersetQuery.builder.queryData[0].limit).toBe(10);
		expect(result.current.currentQuery.builder.queryData[0].limit).toBe(10);
	});
});

describe('QueryBuilderProvider with page constraints', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('seeds and stages the logs query and rewrites only compositeQuery', async () => {
		const replaceState = jest.spyOn(window.history, 'replaceState');
		const pushState = jest.spyOn(window.history, 'pushState');

		const { result } = renderOn(ROUTES.LOGS_EXPLORER, clickhouseUrlQuery, {
			activeLogId: '"log-1"',
		});

		expect(result.current.currentQuery.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.current.supersetQuery.builder.queryData[0].dataSource).toBe(
			DataSource.LOGS,
		);

		await waitFor(() =>
			expect(result.current.stagedQuery?.queryType).toBe(EQueryType.QUERY_BUILDER),
		);
		expect(result.current.stagedQuery?.clickhouse_sql[0].query).toBe('');

		expect(urlQuery().queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(urlQuery().builder.queryData[0].dataSource).toBe(DataSource.LOGS);
		expect(urlQuery().clickhouse_sql[0].query).toBe('');
		expect(activeLogIdParam()).toBe('"log-1"');
		expect(replaceState).toHaveBeenCalled();
		expect(pushState).not.toHaveBeenCalled();
	});

	it('keeps a trace operator on the traces explorer', async () => {
		const { result } = renderOn(ROUTES.TRACES_EXPLORER, tracesWithOperator);

		await waitFor(() =>
			expect(result.current.stagedQuery?.builder.queryTraceOperator).toHaveLength(
				1,
			),
		);
	});

	it('leaves a valid url without source untouched and keeps activeLogId', async () => {
		const { source: _, ...item } = initialQueriesMap.logs.builder.queryData[0];
		const query = {
			...initialQueriesMap.logs,
			builder: { ...initialQueriesMap.logs.builder, queryData: [item] },
		};
		const { result } = renderOn(ROUTES.LOGS_EXPLORER, query, {
			activeLogId: '"log-1"',
		});

		await waitFor(() =>
			expect(result.current.stagedQuery?.id).toBe(initialQueriesMap.logs.id),
		);
		expect(
			new URLSearchParams(window.location.search).get('compositeQuery'),
		).toBe(JSON.stringify(query));
		expect(activeLogIdParam()).toBe('"log-1"');
	});

	it('leaves a clickhouse query alone on a route without constraints', async () => {
		const { result } = renderOn('/unconstrained', clickhouseUrlQuery);

		expect(result.current.currentQuery.queryType).toBe(EQueryType.CLICKHOUSE);
		await waitFor(() =>
			expect(result.current.stagedQuery?.queryType).toBe(EQueryType.CLICKHOUSE),
		);
		expect(urlQuery().clickhouse_sql[0].query).toBe('SELECT 1');
	});
});
