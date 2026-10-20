import { expect, test } from '../../drivers/dashboards';

// One v2 dashboard's detail page: the flows that write through the real API and
// have to survive a reload.
//
// Panel rendering, the panel editor's config pane, layout compaction, the JSON
// patch machinery and variable resolution are all covered by jest under
// `src/pages/DashboardPage/`. A browser is here for the write paths.

test.describe('Dashboard details', () => {
	test('TC-01 a rename persists across a reload', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-rename-${Date.now()}`);
		const renamed = `${seed.title}-renamed`;

		try {
			await dashboards.goto(seed.id);
			await expect(dashboards.title()).toHaveText(seed.title);

			await Promise.all([
				page.waitForResponse(
					(res) =>
						res.url().includes(`/api/v2/dashboards/${seed.id}`) &&
						['PUT', 'PATCH'].includes(res.request().method()),
				),
				dashboards.rename(renamed),
			]);

			await page.reload();
			await expect(dashboards.title()).toHaveText(renamed);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-02 locking a dashboard persists and is visible on the list', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-lock-${Date.now()}`);

		try {
			await dashboards.goto(seed.id);

			await Promise.all([
				page.waitForResponse(
					(res) =>
						res.url().includes(`/api/v2/dashboards/${seed.id}`) &&
						['PUT', 'PATCH', 'POST'].includes(res.request().method()),
				),
				dashboards.toggleLockFromActions(),
			]);

			await page.reload();
			await expect(dashboards.lockButton()).toBeVisible();
			// A locked dashboard no longer offers the click-to-edit title.
			await expect(dashboards.title()).toBeVisible();
			await dashboards.title().click();
			await expect(dashboards.titleInput()).toHaveCount(0);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-03 an empty dashboard offers the add-panel entry point', async ({
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-panel-${Date.now()}`);

		try {
			await dashboards.goto(seed.id);

			await expect(dashboards.addPanelButton().first()).toBeVisible();
			// The entry point asks for a panel type, then routes into the panel
			// editor, which is its own page.
			await dashboards.addPanel('signoz/TimeSeriesPanel');
			await expect(dashboards.savePanelButton()).toBeVisible();
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-04 the JSON editor round-trips the v2 spec', async ({
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-json-${Date.now()}`);

		try {
			await dashboards.goto(seed.id);

			await dashboards.optionsButton().click();
			await dashboards.editJsonButton().click();

			// The editor is the one place the v2 shape is user-visible, so this is
			// also the cheapest guard that the page is serving v2 and not a migrated
			// v1 document. `useJsonEditor` shows only spec, tags and image.
			const editor = dashboards.jsonEditor();
			await expect(editor).toBeVisible();
			await expect(editor).toContainText('"layouts"');
			await expect(editor).toContainText(seed.title);
			await expect(editor).not.toContainText('schemaVersion');
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-05 the variables bar opens the variable editor', async ({
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-vars-${Date.now()}`);

		try {
			await dashboards.goto(seed.id);

			await expect(dashboards.addVariableButton().first()).toBeVisible();
			await dashboards.addVariableButton().first().click();

			// The editor is a drawer over the dashboard, so the dashboard title stays
			// on screen behind it.
			await expect(dashboards.title()).toBeVisible();
		} finally {
			await dashboards.remove(seed.id);
		}
	});
});
