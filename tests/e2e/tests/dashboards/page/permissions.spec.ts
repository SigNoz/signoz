import {
	COMPACT_PANELS,
	compactDashboard,
	DashboardAction,
	expect,
	PanelAction,
	test,
} from '../../../drivers/dashboard-page';

// What a viewer is offered on a dashboard someone else can edit. The gating
// logic is jest (`*.authz.test.tsx`); this checks the real authz endpoint
// denies a real viewer and the menus carry its reason.

const DENIED = /is not authorized to perform/;

test.describe('Dashboards — viewer permissions', () => {
	test.describe.configure({ timeout: 60_000 });

	test.use({ as: 'viewer' });

	test('TC-01 the Actions rows that write are disabled with a reason', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		const id = await dashboards.seedAsAdmin(compactDashboard());
		await dashboards.open(id);

		await dashboardPage.actions.open();

		// A row still checking its permission is disabled too, so the reason is
		// what proves the denial.
		for (const action of [
			DashboardAction.rename,
			DashboardAction.clone,
			DashboardAction.lock,
			DashboardAction.newSection,
			DashboardAction.delete,
		]) {
			const row = dashboardPage.actions.item(action);
			await expect(row).toBeDisabled();
			await expect(await panels.tooltip.reasonFor(row)).toHaveText(DENIED);
		}
		await expect(
			dashboardPage.actions.item(DashboardAction.fullScreen),
		).toBeEnabled();
	});

	test('TC-02 the panel menu disables Edit and Delete with a reason, and View still opens', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAsAdmin(compactDashboard());
		await dashboards.open(id);
		const { actions } = panels.panel(COMPACT_PANELS.timeseries);

		await actions.open();

		for (const label of [PanelAction.edit, PanelAction.delete]) {
			const item = actions.item(label);
			await expect(item).toBeDisabled();
			await expect(await panels.tooltip.reasonFor(item)).toHaveText(DENIED);
		}

		await actions.item(PanelAction.view).click();
		await expect(panels.view.content()).toBeVisible();
	});
});
