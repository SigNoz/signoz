import { expect, test } from '../../../../fixtures/dashboards';
import {
	GOLDEN,
	PanelKind,
	clickhouseQuery,
	logsCountQuery,
	metricsQuery,
	promqlQuery,
	rawQuery,
} from '../../../../helpers/dashboard-v2-spec';
import {
	QueryTab,
	queryTab,
	selectOptions,
} from '../../../../helpers/panel-editor-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the panelKind × queryType × signal matrix, as the editor surfaces it.
//
// Two treatments, and mixing them up is the bug this guards: the type SWITCHER
// disables unsupported kinds (with a reason); the query TABS omit them.

/** The switcher's option labels paired with whether they're selectable. */
async function switcherOptions(
	page: Parameters<typeof selectOptions>[0],
): Promise<{ label: string; disabled: boolean }[]> {
	return selectOptions(page, 'panel-editor-v2-type-switcher');
}

function optionFor(
	options: { label: string; disabled: boolean }[],
	label: string,
): { label: string; disabled: boolean } {
	const match = options.find((option) => option.label.startsWith(label));
	expect(
		match,
		`expected a "${label}" option in the type switcher`,
	).toBeDefined();
	return match as { label: string; disabled: boolean };
}

test.describe('Dashboards V2 — editor capabilities matrix', () => {
	test('TC-01 every kind is selectable for a metrics builder query', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		const options = await switcherOptions(page);
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
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		const options = await switcherOptions(page);
		expect(optionFor(options, 'List').disabled).toBe(true);
	});

	test('TC-03 List becomes selectable for a logs query', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);

		const options = await switcherOptions(page);
		expect(optionFor(options, 'List').disabled).toBe(false);
	});

	test('TC-04 a PromQL panel disables the kinds that cannot read PromQL', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				query: promqlQuery(`sum(rate(${GOLDEN.metrics.calls}[5m]))`),
			}),
			SINGLE_PANEL_ID,
		);

		const options = await switcherOptions(page);
		// Pie, Table and List omit PromQL.
		expect(optionFor(options, 'Pie Chart').disabled).toBe(true);
		expect(optionFor(options, 'Table').disabled).toBe(true);
		expect(optionFor(options, 'List').disabled).toBe(true);

		expect(optionFor(options, 'Time Series').disabled).toBe(false);
		expect(optionFor(options, 'Bar Chart').disabled).toBe(false);
	});

	test('TC-05 a disabled option explains itself in a tooltip', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		await page.getByTestId('panel-editor-v2-type-switcher').click();
		const dropdown = page.locator(
			'.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
		);
		await dropdown
			.locator('.ant-select-item-option-disabled')
			.filter({ hasText: 'List' })
			.first()
			.hover();

		// The wording is the contract users read.
		await expect(
			page.getByText("List doesn't support metrics data"),
		).toBeVisible();
	});

	test('TC-06 a ClickHouse panel keeps Table selectable but not List', async ({
		authedPage: page,
		dashboards,
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

		const options = await switcherOptions(page);
		expect(optionFor(options, 'Table').disabled).toBe(false);

		expect(optionFor(options, 'List').disabled).toBe(true);
	});

	test('TC-07 a List panel hides the query types it cannot use', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.List,
				query: rawQuery({ signal: 'logs' }),
			}),
			SINGLE_PANEL_ID,
		);

		// Hidden, not disabled.
		await expect(queryTab(page, QueryTab.builder)).toBeVisible();
		await expect(queryTab(page, QueryTab.clickhouse)).toHaveCount(0);
		await expect(queryTab(page, QueryTab.promql)).toHaveCount(0);
	});

	test('TC-08 a Table panel offers ClickHouse but not PromQL', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expect(queryTab(page, QueryTab.builder)).toBeVisible();
		await expect(queryTab(page, QueryTab.clickhouse)).toBeVisible();
		await expect(queryTab(page, QueryTab.promql)).toHaveCount(0);
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
