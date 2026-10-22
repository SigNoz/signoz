import {
	clickhouseQuery,
	expect,
	GOLDEN,
	logsCountQuery,
	metricsQuery,
	PanelKind,
	promqlQuery,
	QueryTab,
	rawQuery,
	type SelectOption,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-editor';

// Scope: the panelKind × queryType × signal matrix, as the editor surfaces it.
//
// Two treatments, and mixing them up is the bug this guards: the type SWITCHER
// disables unsupported kinds (with a reason); the query TABS omit them.

function optionFor(options: SelectOption[], label: string): SelectOption {
	const match = options.find((option) => option.label.startsWith(label));
	expect(
		match,
		`expected a "${label}" option in the type switcher`,
	).toBeDefined();
	return match as SelectOption;
}

test.describe('Dashboards V2 — editor capabilities matrix', () => {
	test('TC-01 every kind is selectable for a metrics builder query', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		const options = await editor.typeOptions();
		// List is the exception: logs/traces only.
		for (const label of [
			'Time Series',
			'Number',
			'Table',
			'Bar Chart',
			'Pie Chart',
			'Histogram',
		]) {
			expect(optionFor(options, label).disabled).toBe(false);
		}
	});

	test('TC-02 List is disabled for a metrics query', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		const options = await editor.typeOptions();
		expect(optionFor(options, 'List').disabled).toBe(true);
	});

	test('TC-03 List becomes selectable for a logs query', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);

		const options = await editor.typeOptions();
		expect(optionFor(options, 'List').disabled).toBe(false);
	});

	test('TC-04 a PromQL panel disables the kinds that cannot read PromQL', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				query: promqlQuery(`sum(rate(${GOLDEN.metrics.calls}[5m]))`),
			}),
			SINGLE_PANEL_ID,
		);

		const options = await editor.typeOptions();
		// Pie, Table and List omit PromQL.
		expect(optionFor(options, 'Pie Chart').disabled).toBe(true);
		expect(optionFor(options, 'Table').disabled).toBe(true);
		expect(optionFor(options, 'List').disabled).toBe(true);

		expect(optionFor(options, 'Time Series').disabled).toBe(false);
		expect(optionFor(options, 'Bar Chart').disabled).toBe(false);
	});

	test('TC-05 a disabled option explains itself in a tooltip', async ({
		dashboards,
		editor,
		panels,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		await editor.openTypeSwitcher();
		await expect(editor.typeOption(PanelKind.List)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
		await editor.typeOption(PanelKind.List).hover();

		// The wording is the contract users read.
		await expect(
			panels.tooltip.text("List doesn't support metrics data"),
		).toBeVisible();
	});

	test('TC-06 a ClickHouse panel keeps Table selectable but not List', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.Table,
				query: clickhouseQuery(
					"SELECT now() AS ts, 'adservice' AS service, 1 AS A",
				),
			}),
			SINGLE_PANEL_ID,
		);

		const options = await editor.typeOptions();
		expect(optionFor(options, 'Table').disabled).toBe(false);

		expect(optionFor(options, 'List').disabled).toBe(true);
	});

	test('TC-07 a List panel hides the query types it cannot use', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.List,
				query: rawQuery({ signal: 'logs' }),
			}),
			SINGLE_PANEL_ID,
		);

		// Hidden, not disabled.
		await expect(editor.query.tab(QueryTab.builder)).toBeVisible();
		await expect(editor.query.tab(QueryTab.ai)).toBeVisible();
		await expect(editor.query.tab(QueryTab.clickhouse)).toHaveCount(0);
		await expect(editor.query.tab(QueryTab.promql)).toHaveCount(0);
	});

	test('TC-08 a Table panel offers ClickHouse but not PromQL', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expect(editor.query.tab(QueryTab.builder)).toBeVisible();
		await expect(editor.query.tab(QueryTab.clickhouse)).toBeVisible();
		await expect(editor.query.tab(QueryTab.ai)).toBeVisible();
		await expect(editor.query.tab(QueryTab.promql)).toHaveCount(0);
	});

	test('TC-09 the backend rejects a combination the editor disables', async ({
		dashboards,
	}) => {
		// Enforced server-side too, so an invalid pairing can never be persisted.
		// Pins the layers together: if capabilities.ts and allowedQueryKinds
		// drift, either TC-04 or this fails.
		await expect(
			dashboards.seed(
				singlePanelDashboard({
					kind: PanelKind.PieChart,
					query: promqlQuery(`sum(rate(${GOLDEN.metrics.calls}[5m]))`),
				}),
			),
			// Quotes in the message are JSON-escaped, so match around them.
		).rejects.toThrow(/PromQLQuery.*not supported by panel kind.*PieChartPanel/);
	});
});
