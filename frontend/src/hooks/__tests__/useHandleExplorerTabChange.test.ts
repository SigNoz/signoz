import { renderHook } from '@testing-library/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('hooks/saveViews/useGetSavedViewParams', () => ({
	useGetSavedViewParams: (): { viewKey: string } => ({
		viewKey: '',
	}),
}));

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);

const countOrderBy = [{ columnName: 'count()', order: 'desc' }];

const queryWithOrder = (orderBy: typeof countOrderBy): Query => ({
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: initialQueriesMap.traces.builder.queryData.map((item) => ({
			...item,
			orderBy,
		})),
	},
});

const setUpQueryBuilder = (
	from: PANEL_TYPES,
	currentQuery: Query,
): jest.Mock => {
	const redirectWithQueryBuilderData = jest.fn();

	mockedUseQueryBuilder.mockReturnValue({
		currentQuery,
		panelType: from,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators: (query: Query): Query => query,
		updateQueriesData: (
			query: Query,
			type: 'queryData',
			updateCallback: (item: IBuilderQuery, index: number) => IBuilderQuery,
		): Query => ({
			...query,
			builder: {
				...query.builder,
				[type]: query.builder[type].map(updateCallback),
			},
		}),
	} as unknown as ReturnType<typeof useQueryBuilder>);

	return redirectWithQueryBuilderData;
};

const switchTab = (from: PANEL_TYPES, to: PANEL_TYPES, query: Query): Query => {
	const redirect = setUpQueryBuilder(from, query);

	const { result } = renderHook(() => useHandleExplorerTabChange());
	result.current.handleExplorerTabChange(to);

	return redirect.mock.calls[0][0] as Query;
};

describe('explorer tab change clears the order for raw panels', () => {
	it.each([
		[PANEL_TYPES.TIME_SERIES, PANEL_TYPES.LIST],
		[PANEL_TYPES.TABLE, PANEL_TYPES.LIST],
		[PANEL_TYPES.TRACE, PANEL_TYPES.LIST],
		[PANEL_TYPES.LIST, PANEL_TYPES.TRACE],
	])('clears it on %s -> %s', (from, to) => {
		const query = switchTab(from, to, queryWithOrder(countOrderBy));

		query.builder.queryData.forEach((item) => {
			expect(item.orderBy).toStrictEqual([]);
		});
	});

	it.each([
		[PANEL_TYPES.LIST, PANEL_TYPES.TIME_SERIES],
		[PANEL_TYPES.LIST, PANEL_TYPES.TABLE],
	])('keeps it on %s -> %s, where the sanitizer validates it', (from, to) => {
		const query = switchTab(from, to, queryWithOrder(countOrderBy));

		query.builder.queryData.forEach((item) => {
			expect(item.orderBy).toStrictEqual(countOrderBy);
		});
	});

	it('leaves the order alone when the caller supplies its own query', () => {
		const saved = queryWithOrder([{ columnName: 'timestamp', order: 'asc' }]);
		const redirect = setUpQueryBuilder(
			PANEL_TYPES.TIME_SERIES,
			queryWithOrder(countOrderBy),
		);

		const { result } = renderHook(() => useHandleExplorerTabChange());
		result.current.handleExplorerTabChange(PANEL_TYPES.LIST, { query: saved });

		const sent = redirect.mock.calls[0][0] as Query;
		sent.builder.queryData.forEach((item) => {
			expect(item.orderBy).toStrictEqual([
				{ columnName: 'timestamp', order: 'asc' },
			]);
		});
	});
});
