import {
	expect,
	logsCountQuery,
	PanelKind,
	QueryRange,
	rawQuery,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

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

function listDashboard(
	fields?: { name: string; signal?: 'logs' }[],
): ReturnType<typeof singlePanelDashboard> {
	return singlePanelDashboard({
		kind: PanelKind.List,
		query: rawQuery({ signal: 'logs' }),
		...(fields ? { pluginSpec: { selectFields: fields } } : {}),
	});
}

test.describe('Dashboards — List panel', () => {
	test.describe('pager', () => {
		test('TC-01 the List pager advances and re-queries', async ({
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

		test('TC-02 Previous is disabled on the first page', async ({
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

		test('TC-03 changing the page size re-queries from page 1', async ({
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

	// The one per-kind control that lives in the query builder's footer rather
	// than the ConfigPane. Persists to `plugin.spec.selectFields`.
	test.describe('columns editor', () => {
		test('TC-04 seeded columns render as chips', async ({
			dashboards,
			config,
		}) => {
			await dashboards.seedAndEdit(
				listDashboard([
					{ name: 'timestamp', signal: 'logs' },
					{ name: 'body', signal: 'logs' },
				]),
				SINGLE_PANEL_ID,
			);

			await expect(config.listColumns.chip('timestamp')).toBeVisible();
			await expect(config.listColumns.chip('body')).toBeVisible();
		});

		test('TC-05 a column can be removed and the removal persists', async ({
			dashboards,
			editor,
			config,
		}) => {
			const id = await dashboards.seedAndEdit(
				listDashboard([
					{ name: 'timestamp', signal: 'logs' },
					{ name: 'body', signal: 'logs' },
				]),
				SINGLE_PANEL_ID,
			);

			await config.listColumns.remove('body').click();
			await expect(config.listColumns.chip('body')).toHaveCount(0);
			await editor.save();

			const fields = (await config.saved(id)).plugin.selectFields ?? [];
			expect(fields.map((field) => field.name)).not.toContain('body');
		});

		test('TC-06 a custom column can be added by free text', async ({
			dashboards,
			editor,
			config,
		}) => {
			const id = await dashboards.seedAndEdit(
				listDashboard([{ name: 'timestamp', signal: 'logs' }]),
				SINGLE_PANEL_ID,
			);

			await config.listColumns.open('my_custom_field');
			await config.listColumns.addCustom().click();
			await expect(config.listColumns.chip('my_custom_field')).toBeVisible();

			await editor.save();
			const fields = (await config.saved(id)).plugin.selectFields ?? [];
			expect(fields.map((field) => field.name)).toContain('my_custom_field');
		});

		test('TC-07 a suggested field can be added from the dropdown', async ({
			dashboards,
			editor,
			config,
		}) => {
			const id = await dashboards.seedAndEdit(
				listDashboard([{ name: 'timestamp', signal: 'logs' }]),
				SINGLE_PANEL_ID,
			);

			await config.listColumns.open('service');
			const fieldName = await config.listColumns.pickFirstSuggestion('service');

			await editor.save();
			const fields = (await config.saved(id)).plugin.selectFields ?? [];
			expect(fields.map((field) => field.name)).toContain(fieldName);
		});

		test('TC-08 an empty column set is allowed and explains itself', async ({
			dashboards,
			config,
		}) => {
			await dashboards.seedAndEdit(
				listDashboard([{ name: 'timestamp', signal: 'logs' }]),
				SINGLE_PANEL_ID,
			);

			await config.listColumns.remove('timestamp').click();
			// Empty means "show everything the query returns".
			await expect(
				config.text('Leave empty to show all fields returned by the query.'),
			).toBeVisible();
		});

		test('TC-09 switching a List panel to Table drops the columns editor', async ({
			dashboards,
			editor,
			config,
		}) => {
			// Logs-shaped so Table stays a legal target.
			await dashboards.seedAndEdit(
				singlePanelDashboard({
					kind: PanelKind.List,
					query: logsCountQuery(),
				}),
				SINGLE_PANEL_ID,
			);
			await expect(config.listColumns.editor()).toBeVisible();

			await editor.switchType(PanelKind.Table);

			await expect(config.listColumns.editor()).toHaveCount(0);
		});
	});
});
