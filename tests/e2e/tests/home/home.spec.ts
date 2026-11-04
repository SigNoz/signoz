import { expect, HOME_PROBE, test } from '../../drivers/shell';

// The checklist flags are per-user preferences, so none of this runs as the
// shared bootstrap admin.
test.use({ as: 'admin2' });

test.describe('home', () => {
	test.beforeEach(async ({ shell }) => {
		await shell.home.resetChecklistPrefs();
	});

	test('TC-01 the data-received home renders its widgets against the real backend', async ({
		shell,
		noise,
	}, testInfo) => {
		const service = `e2e-home-svc-w${testInfo.workerIndex}-${Date.now()}`;
		await shell.seedSlowService(service);
		await shell.visit(HOME_PROBE);

		await expect(shell.home.sectionEntry('services', service)).toBeVisible();
		await expect(shell.home.checklist()).toBeVisible();
		await expect(shell.errorBoundary()).toHaveCount(0);
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a seeded alert rule and dashboard appear in their widgets', async ({
		shell,
	}, testInfo) => {
		const stamp = `w${testInfo.workerIndex}-${Date.now()}`;
		const title = `e2e-home-dash-${stamp}`;
		const rule = await shell.seedAlertRule(`e2e-home-rule-${stamp}`);
		const dashboard = await shell.seedDashboard(title);
		try {
			await shell.home.goto();

			// Both widgets show the five most recently updated entries, and sibling
			// workers keep creating more, so the fresh seeds are only guaranteed to
			// be listed right after they are made.
			await expect(shell.home.section('dashboards')).toContainText(title);
			await expect(shell.home.section('alerts')).toContainText(rule.ruleName);
		} finally {
			await shell.removeDashboard(dashboard.id);
			await shell.removeAlertRule(rule);
		}
	});

	test('TC-03 skipping a checklist step persists across a reload', async ({
		shell,
	}) => {
		await shell.home.goto();
		await expect(shell.home.checklist()).toBeVisible();
		const steps = await shell.home.skippableSteps();
		// Alerts, views and dashboards appear and vanish as sibling specs create
		// and delete them, so only ingestion steps are safe to pick.
		const step = steps.find((id) =>
			id.startsWith('SEND_'),
		) as (typeof steps)[number];
		// An ingestion step completes itself once its data exists, and the
		// shared stack may already hold all of it.
		test.skip(!step, 'every ingestion checklist step is already complete');

		await shell.home.skip(step);
		await expect(shell.home.checklistItem(step)).toHaveClass(/skipped/);
		await expect(shell.home.skipButton(step)).toHaveCount(0);

		await shell.reload();
		await expect(shell.home.checklistItem(step)).toHaveClass(/skipped/);
		await expect(shell.home.skipButton(step)).toHaveCount(0);
	});

	test('TC-04 "I\'ll do this later" hides the checklist until reopened', async ({
		shell,
	}) => {
		await shell.home.goto();
		await expect(shell.home.checklist()).toBeVisible();

		await shell.home.doLater();
		await expect(shell.home.checklist()).toHaveCount(0);
		await expect(shell.home.checklistButton()).toBeVisible();

		await shell.reload();
		await expect(shell.home.checklistButton()).toBeVisible();
		await expect(shell.home.checklist()).toHaveCount(0);

		await shell.home.reopenChecklist();
	});

	test('TC-05 an explorer card opens its explorer', async ({ shell }) => {
		await shell.home.goto();
		await shell.home.explorerCard('Open Logs Explorer').click();
		await expect.poll(() => shell.pathname()).toBe('/logs/logs-explorer');
	});
});
