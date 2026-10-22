import {
	COMPACT_PANELS,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	compactDashboard,
	expect,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panels';

// Scope: the tabular-only controls — header search, column resize, and List's
// server-side pager. Paging is mocked (it needs a stable row set).

// Next only enables when a response FILLS the page, so page one must be full.
const PAGE_SIZE = 25;

const LOG_ROWS = Array.from({ length: PAGE_SIZE }, (_, i) => ({
	timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
	body: `page-one line ${i}`,
	'service.name': 'adservice',
}));

const LOG_ROWS_PAGE_TWO = Array.from({ length: 6 }, (_, i) => ({
	timestamp: new Date(Date.UTC(2026, 0, 1, 1, i)).toISOString(),
	body: `page-two line ${i}`,
	'service.name': 'cartservice',
}));

test.describe('Dashboards V2 — table and list controls', () => {
	test('TC-01 header search filters the table and can be cleared', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
			QueryRange.scalar({
				groupColumns: ['service.name'],
				aggregationColumns: ['A'],
				rows: [
					['adservice', 10],
					['cartservice', 20],
					['frontend', 30],
				],
			}),
		);
		await dashboards.seedAndOpen(compactDashboard());

		const table = panels.panel(COMPACT_PANELS.table);
		await table.waitRendered(PanelKind.Table);

		const rows = table.table.rows();
		await expect(rows).toHaveCount(3);

		await table.search.open('cart');
		await expect(rows).toHaveCount(1);

		await table.search.clear().click();
		await expect(rows).toHaveCount(3);
	});

	test('TC-02 Escape closes the search box', async ({ dashboards, panels }) => {
		await dashboards.seedAndOpen(compactDashboard());

		const table = panels.panel(COMPACT_PANELS.table);
		await table.scrollIntoView();
		await table.search.open('cart');

		await panels.pressEscape();
		await expect(table.search.input()).toHaveCount(0);
	});

	test('TC-03 search is not offered on kinds that do not declare it', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const chart = panels.panel(COMPACT_PANELS.timeseries);
		await chart.root().hover();
		await expect(chart.search.trigger()).toHaveCount(0);
	});

	test('TC-04 a resized column persists across a reload', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
			QueryRange.scalar({
				groupColumns: ['service.name'],
				aggregationColumns: ['A'],
				rows: [['adservice', 10]],
			}),
		);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.Table }));

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.renderer(PanelKind.Table)).toBeVisible();

		const before = await target.table.headerWidth('service.name');
		expect(before).toBeGreaterThan(0);

		await target.table.resizeColumn('service.name', 120);

		await expect
			.poll(() => target.table.headerWidth('service.name'))
			.toBeGreaterThan(before);

		// Widths persist behind a 400ms debounce; reloading before it flushes drops
		// the write and looks exactly like a persistence bug.
		await expect
			.poll(() => target.table.storedWidth('service.name'))
			.toBeGreaterThan(before);

		const widened = await target.table.headerWidth('service.name');
		await dashboards.reload();
		await expect(target.renderer(PanelKind.Table)).toBeVisible();
		await expect
			.poll(() => target.table.headerWidth('service.name'))
			.toBeCloseTo(widened, -1);
	});

	test('TC-05 the List pager advances and re-queries', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.sequence([
			QueryRange.raw(LOG_ROWS),
			QueryRange.raw(LOG_ROWS_PAGE_TWO),
		]);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));

		const list = panels.panel(SINGLE_PANEL_ID);
		await list.waitRendered(PanelKind.List);
		await expect(list.pager.page()).toHaveText('Page 1');
		await expect(list.text('page-one line 0')).toBeVisible();

		// Server-side: Next must issue a new query.
		const nextQuery = queryRange.nextRequest();
		await list.pager.next().click();
		await nextQuery;

		await expect(list.pager.page()).toHaveText('Page 2');
		await expect(list.text('page-two line 0')).toBeVisible();
	});

	test('TC-06 Previous is disabled on the first page', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.raw(LOG_ROWS));
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));

		const list = panels.panel(SINGLE_PANEL_ID);
		await list.waitRendered(PanelKind.List);
		await expect(list.pager.prev()).toBeDisabled();
	});

	test('TC-07 changing the page size re-queries from page 1', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.raw(LOG_ROWS));
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));

		const list = panels.panel(SINGLE_PANEL_ID);
		await list.waitRendered(PanelKind.List);

		const next = queryRange.nextRequest();
		await list.pager.next().click();
		await next;
		await expect(list.pager.page()).toHaveText('Page 2');

		const resize = queryRange.nextPaging();
		await list.pager.setPageSize('50 / page');
		expect(await resize).toEqual({ offset: 0, limit: 50 });
		await expect(list.pager.page()).toHaveText('Page 1');
	});
});
