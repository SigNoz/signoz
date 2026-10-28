import {
	type ExplorerTab,
	expect,
	logsView,
	queryRangeBody,
	type SavedViewPanelType,
	test,
	uniqueViewName,
} from '../../drivers/saved-views';

const FILTER = "service.name = 'frontend'";

const PANELS: {
	panelType: SavedViewPanelType;
	tab: ExplorerTab;
	requestType: string;
	aggregation: string | undefined;
	groupBy: string[] | undefined;
}[] = [
	{
		panelType: 'list',
		tab: 'list',
		requestType: 'raw',
		aggregation: undefined,
		groupBy: undefined,
	},
	{
		panelType: 'graph',
		tab: 'timeseries',
		requestType: 'time_series',
		aggregation: 'count()',
		groupBy: ['service.name'],
	},
	{
		panelType: 'table',
		tab: 'table',
		requestType: 'scalar',
		aggregation: 'count()',
		groupBy: ['service.name'],
	},
];

test.describe('Saved views: opening from the list', () => {
	for (const [
		index,
		{ panelType, tab, requestType, aggregation, groupBy },
	] of PANELS.entries()) {
		test(`TC-0${index + 1} a ${panelType} view opens with its query, tab and a clean header`, async ({
			savedViews,
		}) => {
			const view = await savedViews.seed(
				logsView({
					displayName: uniqueViewName(`open ${panelType}`),
					filter: FILTER,
					panelType,
					groupBy,
				}),
			);
			await savedViews.openExplorer();
			const response = await savedViews.open(view);

			expect(savedViews.param('panelTypes')).toBe(JSON.stringify(panelType));
			await expect(savedViews.explorerTab(tab)).toHaveClass(/active-tab/);
			await expect(savedViews.queryBar()).toHaveText(FILTER);
			await expect(savedViews.rowLink(view.id)).toHaveAttribute(
				'aria-current',
				'page',
			);
			await savedViews.expectClean(view.displayName);

			const body = queryRangeBody(response.request());
			expect(body.requestType).toBe(requestType);
			const [query] = body.compositeQuery.queries;
			expect(query.spec.filter?.expression).toBe(FILTER);
			expect(query.spec.aggregations?.[0]?.expression).toBe(aggregation);
			expect(query.spec.groupBy?.map((group) => group.name)).toEqual(groupBy);
		});
	}
});
