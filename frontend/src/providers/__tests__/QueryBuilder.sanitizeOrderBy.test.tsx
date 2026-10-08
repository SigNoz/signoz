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
