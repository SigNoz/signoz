import { expect, test } from '../../../../fixtures/dashboards';
import {
	getDashboardV2ViaApi,
	gotoDashboardV2,
	setDashboardLockedViaApi,
} from '../../../../helpers/dashboards-v2';
import {
	PanelAction,
	closePanelActions,
	downloadPanelAs,
	openPanelActions,
	panelRoot,
	runPanelAction,
} from '../../../../helpers/panels-v2';
import {
	COMPACT_PANELS,
	compactDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the panel ⋮ menu — which items exist per kind, how capability and the
// dashboard lock gate them, and that the mutating ones reach the spec.
//
// Items carry no testid, so everything matches role + visible label.

test.describe('Dashboards V2 — panel actions menu', () => {
	test('TC-01 an editable panel offers the full action set', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		await openPanelActions(page, COMPACT_PANELS.timeseries);

		for (const label of [
			PanelAction.view,
			PanelAction.edit,
			PanelAction.clone,
			PanelAction.download,
			PanelAction.createAlert,
			PanelAction.move,
			PanelAction.delete,
		]) {
			await expect(
				page.getByRole('menuitem', { name: label, exact: true }),
			).toBeVisible();
		}
	});

	test('TC-02 Download offers CSV only on Table', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		// Table declares `csv: true`; others expose PNG/SVG only.
		await openPanelActions(page, COMPACT_PANELS.table);
		await page
			.getByRole('menuitem', { name: PanelAction.download, exact: true })
			.hover();
		await expect(
			page.getByRole('menuitem', { name: PanelAction.downloadCsv, exact: true }),
		).toBeVisible();
		await closePanelActions(page);

		await openPanelActions(page, COMPACT_PANELS.timeseries);
		await page
			.getByRole('menuitem', { name: PanelAction.download, exact: true })
			.hover();
		await expect(
			page.getByRole('menuitem', { name: PanelAction.downloadPng, exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole('menuitem', { name: PanelAction.downloadCsv, exact: true }),
		).toHaveCount(0);
	});

	test('TC-03 Create Alerts is hidden for kinds that do not declare it', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await openPanelActions(page, COMPACT_PANELS.timeseries);
		await expect(
			page.getByRole('menuitem', { name: PanelAction.createAlert, exact: true }),
		).toBeVisible();
		await closePanelActions(page);

		for (const panelId of [COMPACT_PANELS.table, COMPACT_PANELS.list]) {
			await openPanelActions(page, panelId);
			await expect(
				page.getByRole('menuitem', {
					name: PanelAction.createAlert,
					exact: true,
				}),
			).toHaveCount(0);
			await closePanelActions(page);
		}
	});

	test('TC-04 Create Alerts opens the alert builder in a new tab', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const popup = page.context().waitForEvent('page');
		await runPanelAction(
			page,
			COMPACT_PANELS.timeseries,
			PanelAction.createAlert,
		);
		const alertTab = await popup;
		await expect(alertTab).toHaveURL(/\/alerts\/new/);
		await alertTab.close();
	});

	// Chromium-only: headless Firefox/WebKit don't surface the canvas blob as a
	// Playwright download event. CSV and SVG are unaffected.
	test('TC-05 Download as PNG produces a file', async ({
		authedPage: page,
		dashboards,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'headless Firefox/WebKit do not emit a download event for the canvas blob',
		);
		await dashboards.seedAndOpen(compactDashboard());
		await panelRoot(page, COMPACT_PANELS.timeseries).scrollIntoViewIfNeeded();

		const download = page.waitForEvent('download');
		await downloadPanelAs(page, COMPACT_PANELS.timeseries, 'PNG');
		const file = await download;
		expect(file.suggestedFilename()).toMatch(/\.png$/);
	});

	test('TC-06 Clone adds a second panel and persists it', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const before = await getDashboardV2ViaApi(page, id);
		const beforeCount = Object.keys(before.spec.panels).length;

		await runPanelAction(page, COMPACT_PANELS.timeseries, PanelAction.clone);

		await expect
			.poll(async () => {
				const after = await getDashboardV2ViaApi(page, id);
				return Object.keys(after.spec.panels).length;
			})
			.toBe(beforeCount + 1);
	});

	test('TC-07 Delete panel removes the panel and its layout item', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		await runPanelAction(page, COMPACT_PANELS.list, PanelAction.delete);
		await expect(page.getByText('Delete panel?')).toBeVisible();
		await page.getByTestId('confirm-delete').click();

		await expect(panelRoot(page, COMPACT_PANELS.list)).toHaveCount(0);

		// Optimistic: the panel leaves the DOM before the PATCH lands.
		await expect
			.poll(async () => {
				const after = await getDashboardV2ViaApi(page, id);
				return after.spec.panels[COMPACT_PANELS.list];
			})
			.toBeUndefined();

		// The grid item must go too, or a dangling $ref renders an empty tile.
		const after = await getDashboardV2ViaApi(page, id);
		const refs = after.spec.layouts.flatMap((layout) =>
			layout.spec.items.map((item) => item.content.$ref),
		);
		expect(refs).not.toContain(`#/spec/panels/${COMPACT_PANELS.list}`);
	});

	test('TC-08 Move to section relocates the panel between sections', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		await openPanelActions(page, COMPACT_PANELS.timeseries);
		await page
			.getByRole('menuitem', { name: PanelAction.move, exact: true })
			.hover();
		await page.getByRole('menuitem', { name: 'Tabular', exact: true }).click();

		await expect
			.poll(async () => {
				const after = await getDashboardV2ViaApi(page, id);
				const target = after.spec.layouts.find(
					(layout) => layout.spec.display.title === 'Tabular',
				);
				return target?.spec.items.some(
					(item) =>
						item.content.$ref === `#/spec/panels/${COMPACT_PANELS.timeseries}`,
				);
			})
			.toBe(true);
	});

	test('TC-09 a locked dashboard disables the mutating actions', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seed(compactDashboard());
		await setDashboardLockedViaApi(page, id, true);
		await gotoDashboardV2(page, id);

		await openPanelActions(page, COMPACT_PANELS.timeseries);

		// View and Download don't mutate, so they stay available.
		await expect(
			page.getByRole('menuitem', { name: PanelAction.view, exact: true }),
		).toBeEnabled();

		for (const label of [PanelAction.edit, PanelAction.clone]) {
			await expect(
				page.getByRole('menuitem', { name: label, exact: true }),
			).toBeDisabled();
		}
	});
});
