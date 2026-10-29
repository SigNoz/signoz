import {
	PATH,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	expect,
	ramp,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-editor';

// Scope: the View modal, and its two-way handoff with the panel editor.
//
// Both directions carry LIVE, unsaved state — modal → editor via router state
// (`editSpec`), editor → modal via sessionStorage + `compositeQuery`. Losing
// either silently discards in-progress work, so TC-08/TC-09 assert the carried
// state AND that nothing was persisted.

const onEditor = (id: string): RegExp => new RegExp(`/dashboard/${id}/panel/`);

test.describe('Dashboards — View modal', () => {
	test('TC-01 View opens the modal and reflects it in the URL', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());
		const modal = await panels.view.open(SINGLE_PANEL_ID);

		await expect(modal).toBeVisible();
		await expect(panels.view.refresh()).toBeVisible();
		expect(dashboards.param('expandedWidgetId')).toBe(SINGLE_PANEL_ID);
	});

	test('TC-02 the modal opens directly from a deep link', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		await dashboards.visit(
			`${PATH.dashboard(id)}?expandedWidgetId=${SINGLE_PANEL_ID}&graphType=graph`,
		);
		await expect(panels.view.content()).toBeVisible();
	});

	test('TC-03 Refresh re-issues the query', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
			]),
		);
		await dashboards.seedAndOpen(singlePanelDashboard());
		await panels.view.open(SINGLE_PANEL_ID);
		// The modal's own first query must land before Refresh is measured.
		await expect(panels.view.chart.plotArea()).toBeVisible();

		const windows = queryRange.recordWindows();
		await panels.view.refresh().click();

		await expect.poll(() => windows.length).toBeGreaterThan(0);
		expect(windows[0].end).toBeGreaterThan(windows[0].start);
	});

	test('TC-04 switching the panel type in the modal does not persist', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());
		await panels.view.open(SINGLE_PANEL_ID);

		await panels.view.switchType('Table');
		await expect(panels.view.renderer(PanelKind.Table)).toBeVisible();

		await panels.back();
		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			'signoz/TimeSeriesPanel',
		);
	});

	test('TC-05 Switch to Edit Mode hands off to the panel editor', async ({
		authedPage: page,
		dashboards,
		panels,
		editor,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());
		await panels.view.open(SINGLE_PANEL_ID);

		await panels.view.switchToEdit().click();

		await page.waitForURL(onEditor(id));
		await expect(editor.root()).toBeVisible();
	});

	test('TC-06 a locked panel opens in View but offers no Switch to Edit', async ({
		dashboards,
		panels,
	}) => {
		// `canSwitchToEdit = canEditDashboard && !isLocked`, but View itself is not
		// role-gated — so the modal opens and only the handoff button is disabled.
		const id = await dashboards.seed(singlePanelDashboard());
		await dashboards.setLocked(id, true);
		await dashboards.open(id);

		await panels.panel(SINGLE_PANEL_ID).actions.run(PanelAction.view);
		await expect(panels.view.content()).toBeVisible();
		await expect(panels.view.switchToEdit()).toBeDisabled();
		await expect(panels.view.refresh()).toBeVisible();
	});

	test('TC-07 View → Edit → View round-trips with no changes', async ({
		authedPage: page,
		dashboards,
		panels,
		editor,
	}) => {
		const id = await dashboards.seedAndOpen(
			singlePanelDashboard({ panelName: 'Round trip' }),
		);
		await panels.view.open(SINGLE_PANEL_ID);

		await panels.view.switchToEdit().click();
		await page.waitForURL(onEditor(id));
		await expect(editor.title()).toHaveValue('Round trip');
		await expect(editor.unsavedBadge()).toHaveCount(0);

		await editor.switchToView().click();
		await expect(panels.view.content()).toBeVisible();

		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Round trip',
		);
	});

	test('TC-08 an unsaved change in the modal carries into the editor', async ({
		authedPage: page,
		dashboards,
		panels,
		editor,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());
		await panels.view.open(SINGLE_PANEL_ID);

		await panels.view.switchType('Table');
		await expect(panels.view.renderer(PanelKind.Table)).toBeVisible();

		await panels.view.switchToEdit().click();
		await page.waitForURL(onEditor(id));

		// Editor opens on the MODIFIED panel, and still nothing is committed.
		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();
		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			'signoz/TimeSeriesPanel',
		);
	});

	test('TC-09 an unsaved change in the editor carries back into the modal', async ({
		dashboards,
		panels,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.title().fill('Edited but not saved');
		await expect(editor.unsavedBadge()).toBeVisible();

		await editor.switchToView().click();
		await expect(panels.view.content()).toBeVisible();
		await expect(panels.view.dialog()).toContainText('Edited but not saved');

		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Solo panel',
		);
	});
});
