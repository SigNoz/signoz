import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	APM_METRICS_TITLE,
	authToken,
	createDashboardViaApi,
	DEFAULT_DASHBOARD_TITLE,
	deleteDashboardViaApi,
	findDashboardIdByTitle,
	gotoDashboardsList,
	importApmMetricsDashboardViaUI,
	openDashboardActionMenu,
	SEARCH_PLACEHOLDER,
} from '../../helpers/dashboards';

// Tests in this file mutate the dashboard list (create / delete). Run them
// serially within the worker so state from one test does not leak into
// another's assertions. Files still run in parallel via the project-level
// fullyParallel setting.
test.describe.configure({ mode: 'serial' });

// ─── Suite-level seed registry ───────────────────────────────────────────
//
// Every dashboard a test creates is recorded here, and one `afterAll`
// deletes the lot at suite teardown. Individual tests do not need their
// own `try / finally` cleanup blocks.
const seedIds = new Set<string>();
const BASE_FIXTURE_TITLE = 'dashboards-list-base-fixture';

/** Seed a dashboard via API and register it for suite cleanup. */
async function seed(page: Page, title: string): Promise<string> {
	const id = await createDashboardViaApi(page, title);
	seedIds.add(id);
	return id;
}

test.beforeAll(async ({ browser }) => {
	// Persistent fixtures the read-only tests rely on:
	//   - A minimal base dashboard — keeps the list non-empty so the search
	//     input / sort button render. Seeded first via API so the workspace
	//     is populated before the UI import flow runs.
	//   - APM Metrics — a richer, real-world dashboard imported through the
	//     real Import JSON UI flow (file upload + Monaco editor + submit).
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		seedIds.add(await createDashboardViaApi(page, BASE_FIXTURE_TITLE));
		seedIds.add(await importApmMetricsDashboardViaUI(page));
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) {
		return;
	}
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of seedIds) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboards List Page', () => {
	// ─── Page load and layout ────────────────────────────────────────────────

	test('TC-01 page chrome and core controls render', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);

		await expect(page).toHaveURL('/dashboard');
		await expect(page).toHaveTitle('SigNoz | All Dashboards');

		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
		await expect(
			page.getByText('Create and manage dashboards for your workspace.'),
		).toBeVisible();

		await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible();
		await expect(page.getByText('All Dashboards')).toBeVisible();
		await expect(page.getByTestId('sort-by')).toBeVisible();

		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

		await expect(page.getByRole('button', { name: 'Feedback' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
	});

	// ─── Search functionality ────────────────────────────────────────────────

	test('TC-02 search by title returns matching dashboard', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-title';
		await seed(page, name);

		await gotoDashboardsList(page);
		const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);

		await search.fill(name);
		await expect(page).toHaveURL(new RegExp(`search=${name}`));
		await expect(search).toHaveValue(name);
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		await expect(page.getByText(name).first()).toBeVisible();
	});

	test('TC-03 search by tag returns the APM Metrics dashboard', async ({
		authedPage: page,
	}) => {
		// APM Metrics carries multiple tags — searching by one of them ("apm")
		// surfaces the imported dashboard. This exercises the tag-match branch
		// in the filter, distinct from title-match.
		await gotoDashboardsList(page);
		const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);

		await search.fill('apm');
		await expect(page).toHaveURL(/search=apm/);
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
	});

	test('TC-04 direct navigation with ?search= pre-fills the input and filters results', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-deeplink';
		await seed(page, name);

		await page.goto(`/dashboard?search=${name}`);
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });

		await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue(name);
		await expect(page.getByText(name).first()).toBeVisible();
	});

	test('TC-05 clearing search restores the full list', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);

		await search.fill('apm');
		await expect(page).toHaveURL(/search=apm/);

		await search.fill('');
		// The app keeps the empty `search=` param in the URL — assert that no
		// non-empty value remains and that rows are rendered again.
		await expect(page).not.toHaveURL(/search=[^&]/);
		await expect(search).toHaveValue('');
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
	});

	test('TC-06 search with no matching results shows empty state', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);

		await search.fill('xyznonexistent999');

		await expect(page.getByAltText('dashboard-image')).toHaveCount(0);
		await expect(search).toBeVisible();
		await expect(search).toHaveValue('xyznonexistent999');
	});

	test('TC-07 search is case-insensitive', async ({ authedPage: page }) => {
		await gotoDashboardsList(page);
		const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);

		await search.fill(APM_METRICS_TITLE.toLowerCase());
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
	});

	// ─── Sorting ─────────────────────────────────────────────────────────────
	//
	// `sortHandle` in DashboardsList.tsx hard-codes `order: 'descend'` —
	// ascending mode is not yet implemented. Both sort options ride the same
	// descending-only path, so one parameterised test covers them.

	test('TC-08 sort options write columnKey & order=descend to the URL', async ({
		authedPage: page,
	}) => {
		for (const [optionTestId, columnKey] of [
			['sort-by-last-updated', 'updatedAt'],
			['sort-by-last-created', 'createdAt'],
		] as const) {
			await gotoDashboardsList(page);
			await expect(page).not.toHaveURL(/columnKey/);

			await page.getByTestId('sort-by').click();
			const option = page.getByTestId(optionTestId);
			await option.waitFor({ state: 'visible' });
			await option.click();

			await expect(page).toHaveURL(new RegExp(`columnKey=${columnKey}`));
			await expect(page).toHaveURL(/order=descend/);
			await expect(page).not.toHaveURL(/order=ascend/);
		}
	});

	// ─── Row actions (context menu) ──────────────────────────────────────────

	test('TC-09 admin sees all five options in the action menu', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-actions-menu';
		await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);
		await expect(tooltip).toBeVisible();

		await expect(tooltip.getByRole('button', { name: 'View' })).toBeVisible();
		await expect(
			tooltip.getByRole('button', { name: 'Open in New Tab' }),
		).toBeVisible();
		await expect(
			tooltip.getByRole('button', { name: 'Copy Link' }),
		).toBeVisible();
		await expect(
			tooltip.getByRole('button', { name: 'Export JSON' }),
		).toBeVisible();
		// Delete is rendered as a generic, not a button.
		await expect(tooltip.getByText('Delete dashboard')).toBeVisible();
	});

	test('TC-10 view action navigates to the dashboard detail page', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-view';
		await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);
		await tooltip.getByRole('button', { name: 'View' }).click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-11 open in new tab opens the dashboard in a new browser tab', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-newtab';
		await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);

		// Use page.context() — the auth fixture creates its own context per
		// test, which is not the same as the default `context` fixture.
		const [newPage] = await Promise.all([
			page.context().waitForEvent('page'),
			tooltip.getByRole('button', { name: 'Open in New Tab' }).click(),
		]);

		await newPage.waitForLoadState();
		await expect(newPage).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await newPage.close();
	});

	test('TC-12 copy link copies the dashboard URL to the clipboard', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-copy';
		await seed(page, name);

		await gotoDashboardsList(page);
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		const tooltip = await openDashboardActionMenu(page, name);
		await tooltip.getByRole('button', { name: 'Copy Link' }).click();

		await expect(page.getByText(/copied|success/i)).toBeVisible();

		const clipboardText = await page.evaluate(async () =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(globalThis as any).navigator.clipboard.readText(),
		);
		expect(clipboardText).toMatch(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-13 export JSON downloads the dashboard as a JSON file', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-export';
		await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			tooltip.getByRole('button', { name: 'Export JSON' }).click(),
		]);

		expect(download.suggestedFilename()).toMatch(/\.json$/);
	});

	test('TC-14 action menu closes when clicking outside the popover', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-dismiss';
		await seed(page, name);

		await gotoDashboardsList(page);
		await openDashboardActionMenu(page, name);
		await expect(page.getByRole('tooltip')).toBeVisible();

		await page.getByRole('heading', { name: 'Dashboards', level: 1 }).click();
		await expect(page.getByRole('tooltip')).not.toBeVisible();

		await expect(page).toHaveURL(/\/dashboard($|\?)/);
	});

	// ─── Creating dashboards via "New dashboard" dropdown ─────────────────────
	//
	// The "Enter dashboard name…" inline input on the list page is a
	// `RequestDashboardBtn` (template-request feedback form), not a create
	// flow. The only UI create path is the "New dashboard" dropdown.

	test('TC-15 New dashboard dropdown shows exactly three options', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();

		const menu = page.getByRole('menu');
		await expect(menu).toBeVisible();
		await expect(menu.getByTestId('create-dashboard-menu-cta')).toBeVisible();
		await expect(menu.getByTestId('import-json-menu-cta')).toBeVisible();
		await expect(menu.getByTestId('view-templates-menu-cta')).toBeVisible();
	});

	test('TC-16 Create dashboard dropdown option creates a dashboard with the default name', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('create-dashboard-menu-cta').click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await expect(page.getByText('Configure your new dashboard')).toBeVisible();
		// "Configure" appears twice on the new-dashboard onboarding state — once
		// in the toolbar and once in the empty-state section. The test only
		// needs to confirm the onboarding rendered, so .first() is sufficient.
		await expect(
			page.getByRole('button', { name: 'Configure' }).first(),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /New Panel/ }).first(),
		).toBeVisible();

		// Register the UI-created dashboard with the suite teardown. After a
		// successful "Create dashboard" the row must exist — assert that and
		// then unconditionally register, so the test contains no `if`.
		const sampleId = await findDashboardIdByTitle(page, DEFAULT_DASHBOARD_TITLE);
		expect(
			sampleId,
			`${DEFAULT_DASHBOARD_TITLE} not found after UI create`,
		).toBeDefined();
		seedIds.add(sampleId as string);
	});

	test('TC-17 Import JSON dialog opens with code editor and upload button', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText('Import Dashboard JSON')).toBeVisible();
		// "Upload JSON file" appears twice — once as the Ant Upload's hidden
		// span wrapper, once as the visible button. .first() is enough to
		// confirm the upload affordance rendered.
		await expect(
			dialog.getByRole('button', { name: 'Upload JSON file' }).first(),
		).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: 'Import and Next' }),
		).toBeVisible();
	});

	test('TC-18 Import JSON dialog dismisses via Escape and via the close button', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);

		// Escape path — Monaco grabs focus on mount and swallows Escape; click
		// the modal title first to blur Monaco so Ant's Modal `keyboard`
		// handler picks up the keystroke.
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();
		let dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByText('Import Dashboard JSON').click();
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
		await expect(page).toHaveURL(/\/dashboard($|\?)/);

		// Close-button path — re-open and dismiss via the X.
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();
		dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: /close/i }).click();
		await expect(dialog).not.toBeVisible();
		await expect(page).toHaveURL(/\/dashboard($|\?)/);
	});

	// ─── Deleting dashboards ─────────────────────────────────────────────────
	//
	// Known behaviour: clicking Cancel in the confirmation dialog navigates to
	// the dashboard detail page rather than staying on the list.

	test('TC-19 delete confirmation dialog shows dashboard name with Cancel and Delete buttons', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-confirm';
		await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);
		// Ant's Popover can position the tooltip so the "Delete dashboard"
		// item ends up outside the viewport (especially in CI, where font
		// rendering shifts layout subtly). `click({ force: true })` skips
		// actionability checks but Playwright still requires the click
		// coordinates to land inside the viewport. `dispatchEvent('click')`
		// fires the synthetic event directly on the DOM node — React's
		// onClick handler runs normally — and bypasses coordinate checks
		// entirely. This is the robust fix for Ant Popover positioning.
		await tooltip.getByText('Delete dashboard').dispatchEvent('click');

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('heading')).toContainText(
			'Are you sure you want to delete the',
		);
		await expect(dialog.getByRole('heading')).toContainText(name);

		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible();
	});

	test('TC-20 cancelling delete navigates to the dashboard detail page (known behaviour)', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-cancel';
		await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);
		await tooltip.getByText('Delete dashboard').dispatchEvent('click');
		await expect(page.getByRole('dialog')).toBeVisible();

		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-21 confirming delete removes the dashboard from the list', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-confirmed';
		const id = await seed(page, name);

		await gotoDashboardsList(page);
		const tooltip = await openDashboardActionMenu(page, name);
		await tooltip.getByText('Delete dashboard').dispatchEvent('click');

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		// The Delete mutation is async — wait for the API response *and* the
		// dialog to dismiss before navigating away, otherwise React Query's
		// in-flight mutation gets cancelled by the navigation.
		const deleteResponse = page.waitForResponse(
			(r) => r.request().method() === 'DELETE' && /\/dashboards\//.test(r.url()),
		);
		await dialog.getByRole('button', { name: 'Delete' }).click();
		await deleteResponse;
		await expect(dialog).not.toBeVisible();

		// After deletion, searching for the name should return no results.
		await gotoDashboardsList(page);
		await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(name);
		await expect(page.getByAltText('dashboard-image')).toHaveCount(0);

		// The UI delete already removed the resource — drop it from the
		// suite-cleanup set so afterAll doesn't 404 on it.
		seedIds.delete(id);
	});

	// ─── Row click navigation ────────────────────────────────────────────────

	test('TC-22 clicking a dashboard row navigates to the detail page', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-row-click';
		await seed(page, name);

		await gotoDashboardsList(page);
		await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(name);

		await page.getByAltText('dashboard-image').first().click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-23 sidebar Dashboards link navigates to the list page', async ({
		authedPage: page,
	}) => {
		await page.goto('/home');
		// Sidebar items are <div class="nav-item"> with the label as visible
		// text — they're not <a role="link">, so getByRole won't reach them.
		// Filter on the exact label to avoid matching nested items that
		// happen to contain the substring.
		await page
			.locator('.nav-item')
			.filter({ hasText: /^Dashboards$/ })
			.click();
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page).toHaveTitle('SigNoz | All Dashboards');
	});

	// ─── URL state and deep linking ──────────────────────────────────────────

	test('TC-24 browser Back after navigating to a dashboard restores search state', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-back-search';
		await seed(page, name);

		await page.goto(`/dashboard?search=${name}`);
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });

		await page.getByAltText('dashboard-image').first().click();
		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

		await page.goBack();
		await expect(page).toHaveURL(new RegExp(`search=${name}`));
		await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue(name);
	});

	test('TC-25 direct navigation with sort params honours them on load', async ({
		authedPage: page,
	}) => {
		await page.goto('/dashboard?columnKey=updatedAt&order=descend');
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });
		await expect(page).toHaveURL(/columnKey=updatedAt/);
		await expect(page).toHaveURL(/order=descend/);
	});
});
