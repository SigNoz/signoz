import {
	type DownloadFormat,
	expect,
	PANEL_KINDS,
	PanelAction,
	respondWithData,
	SINGLE_PANEL_ID,
	test,
	withSpareSection,
} from '../../../drivers/panel-kinds';

// Scope: what each kind's `actions` declaration turns into on the grid — the ⋮
// menu, its downloads and Create Alerts, drilldown, and header search. Items
// carry no testid, so the menu matches role + visible label.

const DOWNLOADS: DownloadFormat[] = ['CSV', 'PNG', 'SVG'];

const ALWAYS_OFFERED = [
	PanelAction.view,
	PanelAction.edit,
	PanelAction.clone,
	PanelAction.move,
	PanelAction.delete,
];

test.describe('Dashboards contract — panel actions', () => {
	for (const c of PANEL_KINDS) {
		const declared = [
			...(c.createAlert ? [PanelAction.createAlert] : []),
			...(c.downloads.length > 0 ? [PanelAction.download] : []),
		];
		const missing = [PanelAction.createAlert, PanelAction.download].filter(
			(label) => !declared.includes(label),
		);

		test(`TC-01 ${c.label}: the actions menu offers the full set its declaration allows`, async ({
			dashboards,
			panels,
		}) => {
			// A second section, so Move to section has somewhere to go.
			await dashboards.seedAndOpen(withSpareSection(c));
			const { actions } = panels.panel(SINGLE_PANEL_ID);
			await actions.open();

			for (const label of [...ALWAYS_OFFERED, ...declared]) {
				await expect(actions.item(label)).toBeVisible();
			}
			for (const label of missing) {
				await expect(actions.item(label)).toHaveCount(0);
			}
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.downloads.length > 0)) {
		const missing = DOWNLOADS.filter((format) => !c.downloads.includes(format));

		test(`TC-02 ${c.label}: Download offers ${c.downloads.join(', ')} only`, async ({
			dashboards,
			panels,
		}) => {
			await dashboards.seedAndOpen(c.seed());
			const { actions } = panels.panel(SINGLE_PANEL_ID);
			await actions.open();
			await actions.hoverItem(PanelAction.download);

			for (const format of c.downloads) {
				await expect(actions.item(`Download as ${format}`)).toBeVisible();
			}
			for (const format of missing) {
				await expect(actions.item(`Download as ${format}`)).toHaveCount(0);
			}
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.drilldown)) {
		test(`TC-03 ${c.label}: clicking the data opens the drilldown menu`, async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await respondWithData(queryRange, c);
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await target.waitRendered(c.kind);
			await c.click(target);

			await expect(panels.drilldown.menu()).toBeVisible();
			await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
			await expect(panels.drilldown.item('drilldown-view-traces')).toBeVisible();
			await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
		});
	}

	for (const c of PANEL_KINDS.filter((k) => !k.drilldown)) {
		test(`TC-04 ${c.label}: clicking the data opens no menu`, async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await respondWithData(queryRange, c);
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await target.waitRendered(c.kind);
			await c.click(target);

			await expect(panels.drilldown.menu()).toHaveCount(0);
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.headerSearch)) {
		test(`TC-05 ${c.label}: offers header search`, async ({
			dashboards,
			panels,
		}) => {
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await target.waitRendered(c.kind);
			await target.root().hover();
			await expect(target.search.trigger()).toBeVisible();
		});
	}

	for (const c of PANEL_KINDS.filter((k) => !k.headerSearch)) {
		test(`TC-06 ${c.label}: does not offer header search`, async ({
			dashboards,
			panels,
		}) => {
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await target.waitRendered(c.kind);
			await target.root().hover();
			await expect(target.search.trigger()).toHaveCount(0);
		});
	}
});
