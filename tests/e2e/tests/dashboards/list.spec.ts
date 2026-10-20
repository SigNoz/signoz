import { DASHBOARDS_LIST_PATH, expect, test } from '../../drivers/dashboards';

// The v2 dashboards list.
//
// The filter DSL, the row component, the actions popover and the permission
// gating are covered by jest under `src/pages/DashboardsListPage/`; the API's
// list, sort, pagination and validation rules are covered headless by
// `tests/integration/tests/dashboard/03_v2_dashboard.py`. What is here is the
// round trip: a UI action reaching the real API and the list coming back
// changed.

test.describe.configure({ mode: 'serial', timeout: 60_000 });

test.describe('Dashboards list', () => {
	test('TC-01 a dashboard created through the modal appears and opens', async ({
		authedPage: page,
		dashboards,
	}) => {
		const title = `e2e-dash-create-${Date.now()}`;

		try {
			await dashboards.gotoList();
			await dashboards.createThroughUi(title, 'created by the e2e suite');

			// The create flow lands on the new dashboard rather than back on the list.
			await page.waitForURL(new RegExp(`${DASHBOARDS_LIST_PATH}/[^/]+$`));
			await expect(dashboards.title()).toHaveText(title);

			await dashboards.gotoList();
			await dashboards.searchFor(title);
			await expect(dashboards.row(title)).toBeVisible();
		} finally {
			await dashboards.removeByTitle(title);
		}
	});

	test('TC-02 search narrows the list through the API', async ({
		dashboards,
	}) => {
		const stamp = Date.now();
		const wanted = await dashboards.create(`e2e-dash-search-${stamp}`);
		const other = await dashboards.create(`e2e-dash-other-${stamp}`);

		try {
			await dashboards.gotoList();
			await dashboards.searchFor(wanted.title);

			await expect(dashboards.row(wanted.title)).toBeVisible();
			await expect(dashboards.row(other.title)).toHaveCount(0);
		} finally {
			await dashboards.remove(wanted.id);
			await dashboards.remove(other.id);
		}
	});

	test('TC-03 duplicate and delete round-trip through the API', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-actions-${Date.now()}`);

		try {
			await dashboards.gotoList();
			await dashboards.searchFor(seed.title);
			await expect(dashboards.row(seed.title)).toBeVisible();

			await dashboards.openRowActions(seed.title);
			await Promise.all([
				page.waitForResponse(
					(res) =>
						res.url().includes('/api/v2/dashboards') &&
						res.request().method() === 'POST',
				),
				dashboards.action('duplicate').click(),
			]);

			// The copy is a second row under the same search, so the count is the
			// evidence rather than the title, which the app may suffix.
			await dashboards.gotoList();
			await dashboards.searchFor(seed.title);
			await expect
				.poll(async () => (await dashboards.rowTitles()).length)
				.toBeGreaterThan(1);

			await dashboards.openRowActions(seed.title);
			await Promise.all([
				page.waitForResponse(
					(res) =>
						res.url().includes('/api/v2/dashboards/') &&
						res.request().method() === 'DELETE',
				),
				dashboards.action('delete').click(),
				dashboards.listDeleteConfirmButton().click(),
			]);

			await expect.poll(async () => (await dashboards.rowTitles()).length).toBe(1);
		} finally {
			await dashboards.removeByTitle(`${seed.title} - Copy`);
			await dashboards.removeByTitle(seed.title);
			await dashboards.remove(seed.id);
		}
	});

	test('TC-04 a row opens its dashboard', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-open-${Date.now()}`);

		try {
			await dashboards.gotoList();
			await dashboards.searchFor(seed.title);
			await dashboards.row(seed.title).click();

			await page.waitForURL(new RegExp(`${DASHBOARDS_LIST_PATH}/${seed.id}`));
			await expect(dashboards.title()).toHaveText(seed.title);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-05 Rename from the row menu persists and stays on the list', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-list-rename-${Date.now()}`);
		const renamed = `${seed.title}-renamed`;

		try {
			await dashboards.gotoList();
			await dashboards.searchFor(seed.title);
			await dashboards.openRowActions(seed.title);
			await dashboards.action('rename').click();
			await dashboards.renameFromList(renamed);

			await expect(dashboards.row(renamed)).toBeVisible();
			await expect(page).toHaveURL(new RegExp(`${DASHBOARDS_LIST_PATH}(\\?|$)`));
			await expect
				.poll(async () => (await dashboards.fetch(seed.id)).spec.display.name)
				.toBe(renamed);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-06 Edit tags from the row menu persists and stays on the list', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.create(`e2e-dash-list-tags-${Date.now()}`);

		try {
			await dashboards.gotoList();
			await dashboards.searchFor(seed.title);
			await dashboards.openRowActions(seed.title);
			await dashboards.action('edit-tags').click();
			await dashboards.editTagsFromList(['team:e2e', 'env:test']);

			await expect(page).toHaveURL(new RegExp(`${DASHBOARDS_LIST_PATH}(\\?|$)`));
			await expect
				.poll(async () => (await dashboards.fetch(seed.id)).tags ?? [])
				.toEqual(
					expect.arrayContaining([
						expect.objectContaining({ key: 'team', value: 'e2e' }),
						expect.objectContaining({ key: 'env', value: 'test' }),
					]),
				);
		} finally {
			await dashboards.remove(seed.id);
		}
	});
});
