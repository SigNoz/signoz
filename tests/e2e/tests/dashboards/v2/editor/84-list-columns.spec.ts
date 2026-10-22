import {
	expect,
	logsCountQuery,
	PanelKind,
	rawQuery,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

// Scope: the List columns editor — the one per-kind control that lives in the
// query builder's footer rather than the ConfigPane. Persists to
// `plugin.spec.selectFields`.

function listDashboard(
	fields?: { name: string; signal?: 'logs' }[],
): ReturnType<typeof singlePanelDashboard> {
	return singlePanelDashboard({
		kind: PanelKind.List,
		query: rawQuery({ signal: 'logs' }),
		...(fields ? { pluginSpec: { selectFields: fields } } : {}),
	});
}

test.describe('Dashboards V2 — editor list columns', () => {
	test('TC-01 the columns editor renders only for List panels', async ({
		dashboards,
		config,
	}) => {
		await dashboards.seedAndEdit(listDashboard(), SINGLE_PANEL_ID);
		await expect(config.listColumns.editor()).toBeVisible();
	});

	test('TC-02 a TimeSeries panel has no columns editor', async ({
		dashboards,
		editor,
		config,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.query.builder()).toBeVisible();
		await expect(config.listColumns.editor()).toHaveCount(0);
	});

	test('TC-03 seeded columns render as chips', async ({
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

	test('TC-04 a column can be removed and the removal persists', async ({
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

	test('TC-05 a custom column can be added by free text', async ({
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

	test('TC-06 a suggested field can be added from the dropdown', async ({
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

	test('TC-07 an empty column set is allowed and explains itself', async ({
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

	test('TC-08 switching a List panel to Table drops the columns editor', async ({
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
