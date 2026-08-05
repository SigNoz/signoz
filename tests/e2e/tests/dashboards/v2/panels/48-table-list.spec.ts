import { expect, test } from '../../../../fixtures/dashboards';
import { PanelKind } from '../../../../helpers/dashboard-v2-spec';
import {
	boundingBoxOf,
	listPager,
	panelRoot,
	searchInPanel,
} from '../../../../helpers/panels-v2';
import {
	QueryRange,
	mockQueryRange,
	mockQueryRangeSequence,
} from '../../../../helpers/query-range-mock';
import {
	COMPACT_PANELS,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	compactDashboard,
} from '../../../../testdata/v2/panels-dashboard';

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
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
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

		const root = panelRoot(page, COMPACT_PANELS.table);
		await root.scrollIntoViewIfNeeded();
		await expect(root.getByTestId('table-panel-renderer')).toBeVisible();

		const rows = root.locator('tbody tr.ant-table-row');
		await expect(rows).toHaveCount(3);

		await searchInPanel(page, COMPACT_PANELS.table, 'cart');
		await expect(rows).toHaveCount(1);

		await root.getByTestId('panel-header-search-clear').click();
		await expect(rows).toHaveCount(3);
	});

	test('TC-02 Escape closes the search box', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.table);
		await root.scrollIntoViewIfNeeded();
		await searchInPanel(page, COMPACT_PANELS.table, 'cart');

		await page.keyboard.press('Escape');
		await expect(root.getByTestId('panel-header-search-input')).toHaveCount(0);
	});

	test('TC-03 search is not offered on kinds that do not declare it', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const chart = panelRoot(page, COMPACT_PANELS.timeseries);
		await chart.hover();
		await expect(chart.getByTestId('panel-header-search-trigger')).toHaveCount(0);
	});

	test('TC-04 a resized column persists across a reload', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.scalar({
				groupColumns: ['service.name'],
				aggregationColumns: ['A'],
				rows: [['adservice', 10]],
			}),
		);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.Table }));

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await expect(root.getByTestId('table-panel-renderer')).toBeVisible();

		const header = root.locator('th').filter({ hasText: 'service.name' });
		const before = (await header.boundingBox())?.width ?? 0;
		expect(before).toBeGreaterThan(0);

		const gripBox = await boundingBoxOf(
			root.getByTestId('column-resize-service.name'),
			'the resize grip',
		);
		await page.mouse.move(
			gripBox.x + gripBox.width / 2,
			gripBox.y + gripBox.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(gripBox.x + 120, gripBox.y + gripBox.height / 2, {
			steps: 10,
		});
		await page.mouse.up();

		await expect
			.poll(async () => (await header.boundingBox())?.width ?? 0)
			.toBeGreaterThan(before);

		// Widths persist behind a 400ms debounce; reloading before it flushes drops
		// the write and looks exactly like a persistence bug.
		await expect
			.poll(async () =>
				page.evaluate((panelId) => {
					const raw = localStorage.getItem('DASHBOARD_V2_PANEL_COLUMN_WIDTHS');
					const widths = raw ? JSON.parse(raw) : {};
					return widths?.[panelId]?.['service.name'] ?? 0;
				}, SINGLE_PANEL_ID),
			)
			.toBeGreaterThan(before);

		const widened = (await header.boundingBox())?.width ?? 0;
		await page.reload();
		await expect(root.getByTestId('table-panel-renderer')).toBeVisible();
		await expect
			.poll(async () => (await header.boundingBox())?.width ?? 0)
			.toBeCloseTo(widened, -1);
	});

	test('TC-05 the List pager advances and re-queries', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRangeSequence(page, [
			QueryRange.raw(LOG_ROWS),
			QueryRange.raw(LOG_ROWS_PAGE_TWO),
		]);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await root.scrollIntoViewIfNeeded();
		await expect(root.getByTestId('list-panel-renderer')).toBeVisible();
		await expect(listPager.page(page, SINGLE_PANEL_ID)).toHaveText('Page 1');
		await expect(root.getByText('page-one line 0')).toBeVisible();

		// Server-side: Next must issue a new query.
		const nextQuery = page.waitForRequest((r) =>
			r.url().includes('/query_range'),
		);
		await listPager.next(page, SINGLE_PANEL_ID).click();
		await nextQuery;

		await expect(listPager.page(page, SINGLE_PANEL_ID)).toHaveText('Page 2');
		await expect(root.getByText('page-two line 0')).toBeVisible();
	});

	test('TC-06 Previous is disabled on the first page', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.raw(LOG_ROWS));
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await root.scrollIntoViewIfNeeded();
		await expect(root.getByTestId('list-panel-renderer')).toBeVisible();
		await expect(listPager.prev(page, SINGLE_PANEL_ID)).toBeDisabled();
	});

	test('TC-07 changing the page size re-queries', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.raw(LOG_ROWS));
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await root.scrollIntoViewIfNeeded();
		await expect(root.getByTestId('list-panel-renderer')).toBeVisible();

		const resize = page.waitForRequest((r) => r.url().includes('/query_range'));
		await listPager.pageSize(page, SINGLE_PANEL_ID).click();
		await page
			.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
			.getByText('50 / page')
			.click();
		await resize;

		// Page size resets to page 1.
		await expect(listPager.page(page, SINGLE_PANEL_ID)).toHaveText('Page 1');
	});
});
