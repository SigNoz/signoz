import type { Page } from '@playwright/test';

import { expect, test } from '../../../../fixtures/dashboards';
import {
	PanelKind,
	logsCountQuery,
} from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	Section,
	editor,
	expandSection,
	savePanel,
	selectOption,
} from '../../../../helpers/panel-editor-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: switching kind mid-edit — what the session cache restores, and which
// config survives a first-visit transfer. Config only carries when the TARGET
// kind declares that control (buildPluginSpec).

async function switchKind(page: Page, label: string): Promise<void> {
	await selectOption(page, 'panel-editor-v2-type-switcher', label);
}

test.describe('Dashboards V2 — panel type switching', () => {
	test('TC-01 switching kind re-renders the preview', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(page.getByTestId('time-series-renderer')).toBeVisible();

		await switchKind(page, 'Table');
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();
		await expect(page.getByTestId('time-series-renderer')).toHaveCount(0);
	});

	test('TC-02 switching marks the editor dirty but does not persist', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		await switchKind(page, 'Number');

		await expect(editor.unsavedBadge(page)).toBeVisible();
		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			PanelKind.TimeSeries,
		);
	});

	test('TC-03 switching back restores the original kind from the session cache', async ({
		authedPage: page,
		dashboards,
	}) => {
		// Logs, because List rejects metrics; time_series-shaped, because Table
		// can't read `raw`.
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table, query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();

		await switchKind(page, 'List');
		await expect(page.getByTestId('list-panel-renderer')).toBeVisible();

		// The per-kind cache makes the round trip reversible.
		await switchKind(page, 'Table');
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();
	});

	test('TC-04 the session cache does not survive a reload', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await switchKind(page, 'Table');
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();

		// The cache is a ref on the mounted editor, so a reload drops it. Reload
		// alone — a redundant goto afterwards crashed the page on WebKit.
		await page.reload();
		await expect(editor.root(page)).toBeVisible();
		await expect(page.getByTestId('time-series-renderer')).toBeVisible();
	});

	test('TC-05 a saved switch persists the new kind', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		await switchKind(page, 'Bar Chart');
		await savePanel(page);

		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			PanelKind.BarChart,
		);
	});

	test('TC-06 sections follow the target kind', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		// Time Series declares Axes and Chart Appearance.
		await expect(
			page.getByTestId('config-section-chart-appearance'),
		).toBeVisible();

		await switchKind(page, 'Number');
		// Number declares neither, but keeps Formatting.
		await expect(page.getByTestId('config-section-chart-appearance')).toHaveCount(
			0,
		);
		await expect(page.getByTestId('config-section-axes')).toHaveCount(0);
		await expect(
			page.getByTestId('config-section-formatting-&-units'),
		).toBeVisible();
	});

	test('TC-07 a panel-wide unit fans out into per-column units on Table', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ pluginSpec: { formatting: { unit: 'ms' } } }),
			SINGLE_PANEL_ID,
		);

		await switchKind(page, 'Table');
		await savePanel(page);

		// Table has no panel-wide unit, so it fans out to columns — one-way.
		const after = await getDashboardV2ViaApi(page, id);
		const formatting =
			after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.formatting;
		expect(formatting?.unit).toBeUndefined();
		expect(Object.values(formatting?.columnUnits ?? {})).toContain('ms');
	});

	test('TC-08 custom legend colours are dropped on a first-visit switch', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({
				pluginSpec: {
					legend: { position: 'bottom', customColors: { adservice: '#ff0000' } },
				},
			}),
			SINGLE_PANEL_ID,
		);

		await switchKind(page, 'Bar Chart');
		await savePanel(page);

		// Keyed by series label, which the new kind may not reproduce, so dropped.
		// Round-trips as null rather than being omitted.
		const after = await getDashboardV2ViaApi(page, id);
		const { customColors } =
			after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.legend ?? {};
		expect(customColors ?? undefined).toBeUndefined();
	});

	test('TC-09 axis bounds survive a switch between kinds that both declare them', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.axes);
		await page.getByTestId('panel-editor-v2-soft-min').fill('5');
		await page.getByTestId('panel-editor-v2-soft-max').fill('50');

		// Bar Chart also declares minMax, so the bounds must carry over.
		await switchKind(page, 'Bar Chart');
		await savePanel(page);

		const after = await getDashboardV2ViaApi(page, id);
		const axes = after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.axes;
		expect(axes?.softMin).toBe(5);
		expect(axes?.softMax).toBe(50);
	});
});
