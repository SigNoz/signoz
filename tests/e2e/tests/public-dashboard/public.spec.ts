import { expect, test } from '../../drivers/public-dashboard';

test.describe('public dashboards', () => {
	test('TC-01 a dashboard published in the UI renders for a logged-out visitor', async ({
		publicDashboards,
		publicView,
	}, testInfo) => {
		const title = `e2e-public-w${testInfo.workerIndex}-${Date.now()}`;
		const dashboard = await publicDashboards.create(title);
		try {
			await publicDashboards.openPublishTab(dashboard.id);
			await expect(publicDashboards.privateStatus()).toBeVisible();

			await publicDashboards.publishInUi();
			await expect(publicDashboards.liveStatus()).toBeVisible();
			await expect(publicDashboards.publicUrl()).toBeVisible();

			const path = await publicDashboards.publicPath(dashboard.id);
			expect(path).toMatch(/^\/public\/dashboard\//);

			await publicView.goto(path ?? '');
			await expect(publicView.title(title)).toBeVisible();
			await expect(publicView.sidenav()).toHaveCount(0);
			await expect(publicView.settingsNavItem()).toHaveCount(0);
		} finally {
			await publicDashboards.unpublish(dashboard.id);
			await publicDashboards.remove(dashboard.id);
		}
	});

	test('TC-02 unpublishing makes the public link unavailable', async ({
		publicDashboards,
		publicView,
	}, testInfo) => {
		const title = `e2e-unpublish-w${testInfo.workerIndex}-${Date.now()}`;
		const dashboard = await publicDashboards.create(title);
		try {
			const path = await publicDashboards.publish(dashboard.id);

			await publicDashboards.openPublishTab(dashboard.id);
			await expect(publicDashboards.liveStatus()).toBeVisible();
			await publicDashboards.unpublishInUi();
			await expect(publicDashboards.privateStatus()).toBeVisible();

			await publicView.goto(path);
			await expect(publicView.unavailable()).toBeVisible();
		} finally {
			await publicDashboards.unpublish(dashboard.id);
			await publicDashboards.remove(dashboard.id);
		}
	});
});
