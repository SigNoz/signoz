import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { act, AllTheProviders, renderHook } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from 'utils/getUnstableCurrentSearchParams';

const timestampOrderBy = [{ columnName: 'timestamp', order: 'desc' }];

const queryWithTimestampOrder = (base: Query): Query => ({
	...base,
	builder: {
		...base.builder,
		queryData: base.builder.queryData.map((item) => ({
			...item,
			orderBy: timestampOrderBy,
		})),
	},
});

const renderOn = (
	route: string,
	panelType: PANEL_TYPES | null,
): ReturnType<typeof renderHook> => {
	const search = new URLSearchParams();
	if (panelType) {
		search.set('panelTypes', JSON.stringify(panelType));
	}
	__setSearchParamsGetterForTest(() => search);

	return renderHook(() => useQueryBuilder(), {
		wrapper: ({ children }): JSX.Element => (
			<AllTheProviders initialRoute={route}>{children}</AllTheProviders>
		),
	});
};

const initOn = (
	route: string,
	panelType: PANEL_TYPES | null,
	query: Query,
): Query | null => {
	const search = new URLSearchParams();
	if (panelType) {
		search.set('panelTypes', JSON.stringify(panelType));
	}
	__setSearchParamsGetterForTest(() => search);

	const { result } = renderHook(() => useQueryBuilder(), {
		wrapper: ({ children }): JSX.Element => (
			<AllTheProviders initialRoute={route}>{children}</AllTheProviders>
		),
	});

	act(() => {
		result.current.initQueryBuilderData(query);
	});

	return result.current.stagedQuery;
};

describe('explorer orderBy sanitizing by panel type', () => {
	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('keeps the order on the logs list panel', () => {
		const staged = initOn(
			ROUTES.LOGS_EXPLORER,
			PANEL_TYPES.LIST,
			queryWithTimestampOrder(initialQueriesMap.logs),
		);

		expect(staged?.builder.queryData[0].orderBy).toStrictEqual(timestampOrderBy);
	});

	it('keeps the order when panelTypes is absent, since the explorers default to list', () => {
		const staged = initOn(
			ROUTES.LOGS_EXPLORER,
			null,
			queryWithTimestampOrder(initialQueriesMap.logs),
		);

		expect(staged?.builder.queryData[0].orderBy).toStrictEqual(timestampOrderBy);
	});

	it('keeps the order on the traces trace panel', () => {
		const staged = initOn(
			ROUTES.TRACES_EXPLORER,
			PANEL_TYPES.TRACE,
			queryWithTimestampOrder(initialQueriesMap.traces),
		);

		expect(staged?.builder.queryData[0].orderBy).toStrictEqual(timestampOrderBy);
	});

	// engineering-pod#2813: a timestamp order carried from the list view into the
	// time series tab is not a group-by key or an aggregation, and errors the query.
	it('drops the order on the time series panel', () => {
		const staged = initOn(
			ROUTES.LOGS_EXPLORER,
			PANEL_TYPES.TIME_SERIES,
			queryWithTimestampOrder(initialQueriesMap.logs),
		);

		expect(staged?.builder.queryData[0].orderBy).toStrictEqual([]);
	});

	it('drops the order on the table panel', () => {
		const staged = initOn(
			ROUTES.TRACES_EXPLORER,
			PANEL_TYPES.TABLE,
			queryWithTimestampOrder(initialQueriesMap.traces),
		);

		expect(staged?.builder.queryData[0].orderBy).toStrictEqual([]);
	});
});

// handleRunQuery means "respect the query I just built" for the init it causes.
// It used to stay set for the rest of the visit, so every later init skipped
// sanitizing as well.
describe('the run bypass is one-shot', () => {
	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('skips sanitizing for the init after a run, and sanitizes the next one', () => {
		const { result } = renderOn(ROUTES.LOGS_EXPLORER, PANEL_TYPES.TIME_SERIES);

		act(() => {
			(result.current as ReturnType<typeof useQueryBuilder>).handleRunQuery();
		});

		const afterRun = {
			...queryWithTimestampOrder(initialQueriesMap.logs),
			id: 'run-1',
		};
		act(() => {
			(result.current as ReturnType<typeof useQueryBuilder>).initQueryBuilderData(
				afterRun,
			);
		});
		expect(
			(result.current as ReturnType<typeof useQueryBuilder>).stagedQuery?.builder
				.queryData[0].orderBy,
		).toStrictEqual(timestampOrderBy);

		const next = {
			...queryWithTimestampOrder(initialQueriesMap.logs),
			id: 'run-2',
		};
		act(() => {
			(result.current as ReturnType<typeof useQueryBuilder>).initQueryBuilderData(
				next,
			);
		});
		expect(
			(result.current as ReturnType<typeof useQueryBuilder>).stagedQuery?.builder
				.queryData[0].orderBy,
		).toStrictEqual([]);
	});
});
