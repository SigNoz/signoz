import type { Browser, BrowserContext, Page } from '@playwright/test';

import apmMetricsTemplate from '../../fixtures/apm-metrics.json';
import { expect, test } from '../../fixtures/auth';

// Spec-local login — used only by `beforeAll` / `afterAll` because the
// `authedPage` fixture is test-scoped and not visible to suite hooks. Each
// hook does one fresh login (~1s) per worker; we deliberately do not import
// or modify the per-worker storage cache from `fixtures/auth.ts`.
async function newAdminContext(browser: Browser): Promise<BrowserContext> {
	const email = process.env.SIGNOZ_E2E_USERNAME;
	const password = process.env.SIGNOZ_E2E_PASSWORD;
	if (!email || !password) {
		throw new Error(
			'SIGNOZ_E2E_USERNAME / SIGNOZ_E2E_PASSWORD must be set ' +
				'(pytest bootstrap writes them to .env.local).',
		);
	}
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.goto('/login?password=Y');
	await page.getByTestId('email').fill(email);
	await page.getByTestId('initiate_login').click();
	await page.getByTestId('password').fill(password);
	await page.getByRole('button', { name: 'Sign in with Password' }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
	await page.close();
	return ctx;
}

// Tests in this file mutate the dashboard list (create / delete). Run them
// serially within the worker so state from one test does not leak into
// another's assertions. Files still run in parallel via the project-level
// fullyParallel setting.
test.describe.configure({ mode: 'serial' });

const SEARCH_PLACEHOLDER = 'Search by name, description, or tags...';

// ─── Suite-level seed & teardown ─────────────────────────────────────────
//
// The pytest harness creates a fresh stack with zero dashboards. Tests seed
// what they need via the API and register the resulting IDs in `seedIds`.
// One `afterAll` deletes everything in `seedIds` at the end of the suite —
// individual tests do not need their own `try / finally` cleanup blocks.
const seedIds = new Set<string>();

// Names a test wants to assert on. Stable, descriptive, no timestamps.
const APM_METRICS_TITLE = (apmMetricsTemplate as { title: string }).title;
const BASE_FIXTURE_TITLE = 'dashboards-list-base-fixture';

// Reads the JWT that the auth fixture stored in localStorage after login.
// `page.request.*` requires the page to first navigate to the SigNoz origin
// so localStorage is populated from the storageState the context was created
// with.
async function authToken(page: Page): Promise<string> {
	if (!page.url().startsWith('http')) {
		await page.goto('/dashboard');
	}
	return page.evaluate(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		() => (globalThis as any).localStorage.getItem('AUTH_TOKEN') || '',
	);
}

async function postDashboard(
	page: Page,
	body: Record<string, unknown>,
): Promise<string> {
	const token = await authToken(page);
	const res = await page.request.post('/api/v1/dashboards', {
		data: body,
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`POST /dashboards ${res.status()}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: { id: string } };
	const id = json.data.id;
	seedIds.add(id);
	return id;
}

// Seed a minimal named dashboard via API. Tracks the ID for suite teardown.
async function createDashboard(page: Page, title: string): Promise<string> {
	return postDashboard(page, { title, uploadedGrafana: false });
}

// Seed the full APM Metrics dashboard from the JSON fixture (title + tags +
// description + panels). Used by tests that want to assert on richer row
// content (multi-tag rendering, description, etc.).
async function importApmMetricsDashboard(page: Page): Promise<string> {
	return postDashboard(page, {
		...(apmMetricsTemplate as Record<string, unknown>),
		uploadedGrafana: false,
	});
}

// The page heading is the only element that's always present — independent
// of whether the workspace has dashboards (list view) or is empty (zero-state).
async function gotoList(page: Page): Promise<void> {
	await page.goto('/dashboard');
	await page
		.getByRole('heading', { name: 'Dashboards', level: 1 })
		.waitFor({ state: 'visible' });
}

// Find a dashboard ID by title via the list API.
async function findDashboardIdByTitle(
	page: Page,
	title: string,
): Promise<string | undefined> {
	const token = await authToken(page);
	const res = await page.request.get('/api/v1/dashboards', {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		return undefined;
	}
	const body = (await res.json()) as {
		data: Array<{ id: string; data: { title: string } }>;
	};
	return body.data.find((d) => d.data.title === title)?.id;
}

// ─── beforeAll / afterAll ────────────────────────────────────────────────

test.beforeAll(async ({ browser }) => {
	// Seed the two persistent fixtures the read-only tests rely on:
	//   - APM Metrics — a richer, real-world dashboard imported from JSON
	//   - A minimal base dashboard — used by tests that just need the list
	//     to be non-empty so the search input / sort button render
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		await importApmMetricsDashboard(page);
		await createDashboard(page, BASE_FIXTURE_TITLE);
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
		for (const id of [...seedIds]) {
			await ctx.request
				.delete(`/api/v1/dashboards/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				})
				.catch(() => undefined);
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
		await gotoList(page);

		await expect(page).toHaveURL('/dashboard');
		await expect(page).toHaveTitle('SigNoz | All Dashboards');

		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
		await expect(
			page.getByText('Create and manage dashboards for your workspace.'),
		).toBeVisible();

		await expect(
			page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }),
		).toBeVisible();
		await expect(page.getByText('All Dashboards')).toBeVisible();
		await expect(page.getByTestId('sort-by')).toBeVisible();

		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

		await expect(page.getByRole('button', { name: 'Feedback' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
	});

	test('TC-02 row shows thumbnail and creator email', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page
			.getByAltText('dashboard-image')
			.first()
			.waitFor({ state: 'visible' });

		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		// Creator email — admin@integration.test contains '@'
		await expect(page.getByText(/@/).first()).toBeVisible();
	});

	// ─── Search functionality ────────────────────────────────────────────────

	test('TC-03 search by title returns matching dashboard', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-title';
		await createDashboard(page, name);

		await gotoList(page);
		const search = page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

		await search.fill(name);
		await expect(page).toHaveURL(new RegExp(`search=${name}`));
		await expect(search).toHaveValue(name);
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		await expect(page.getByText(name).first()).toBeVisible();
	});

	test('TC-04 search by tag returns the APM Metrics dashboard', async ({
		authedPage: page,
	}) => {
		// APM Metrics is imported from JSON and carries multiple tags. We search
		// by one of them ("apm") and expect the imported dashboard to surface.
		await gotoList(page);
		const search = page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

		await search.fill('apm');
		await expect(page).toHaveURL(/search=apm/);
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
	});

	test('TC-05 direct navigation with ?search= pre-fills the input and filters results', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-deeplink';
		await createDashboard(page, name);

		await page.goto(`/dashboard?search=${name}`);
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });

		await expect(
			page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }),
		).toHaveValue(name);
		await expect(page.getByText(name).first()).toBeVisible();
	});

	test('TC-06 clearing search restores the full list', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		const search = page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

		await search.fill('apm');
		await expect(page).toHaveURL(/search=apm/);

		await search.fill('');
		// The app keeps the empty `search=` param in the URL — assert that no
		// non-empty value remains, and that rows are rendered again.
		await expect(page).not.toHaveURL(/search=[^&]/);
		await expect(search).toHaveValue('');
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
	});

	test('TC-07 search with no matching results shows empty state', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		const search = page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

		await search.fill('xyznonexistent999');

		await expect(page.getByAltText('dashboard-image')).toHaveCount(0);
		await expect(search).toBeVisible();
		await expect(search).toHaveValue('xyznonexistent999');
	});

	test('TC-08 search is case-insensitive', async ({ authedPage: page }) => {
		await gotoList(page);
		const search = page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

		await search.fill(APM_METRICS_TITLE.toLowerCase());
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
	});

	// ─── Sorting ─────────────────────────────────────────────────────────────
	//
	// Known behaviour (verified against the running app):
	//   - Fresh load: no sort params in URL; list is already descending (server default)
	//   - First selection: URL gains ?columnKey=updatedAt&order=descend
	//   - `sortHandle` in DashboardsList.tsx hard-codes `order: 'descend'` —
	//     ascending mode is not yet implemented in any code path

	test('TC-09 default load has no sort params', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await expect(page).toHaveURL('/dashboard');
		await expect(page).not.toHaveURL(/columnKey/);
		await expect(page).not.toHaveURL(/order/);

		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
	});

	test('TC-10 selecting "Last updated" adds columnKey=updatedAt&order=descend to URL', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await expect(page).not.toHaveURL(/columnKey/);
		await page.getByTestId('sort-by').click();
		const lastUpdated = page.getByTestId('sort-by-last-updated');
		await lastUpdated.waitFor({ state: 'visible' });
		await lastUpdated.click();

		await expect(page).toHaveURL(/columnKey=updatedAt/);
		await expect(page).toHaveURL(/order=descend/);
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
	});

	test('TC-11 selecting "Last created" also yields order=descend (ascending not yet implemented)', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page.getByTestId('sort-by').click();
		const lastCreated = page.getByTestId('sort-by-last-created');
		await lastCreated.waitFor({ state: 'visible' });
		await lastCreated.click();

		await expect(page).toHaveURL(/columnKey=createdAt/);
		await expect(page).toHaveURL(/order=descend/);
		await expect(page).not.toHaveURL(/order=ascend/);
	});

	// ─── Row actions (context menu) ──────────────────────────────────────────

	test('TC-12 admin sees all five options in the action menu', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-actions-menu';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByTestId('dashboard-action-icon').first().click();
		const tooltip = page.getByRole('tooltip');
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
		// Delete is rendered as a generic, not a button
		await expect(tooltip.getByText('Delete dashboard')).toBeVisible();
	});

	test('TC-13 view action navigates to the dashboard detail page', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-view';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByTestId('dashboard-action-icon').first().click();
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'View' })
			.click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-14 open in new tab opens the dashboard in a new browser tab', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-newtab';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByTestId('dashboard-action-icon').first().click();

		// Use page.context() — the auth fixture creates its own context per
		// test, which is not the same as the default `context` fixture.
		const [newPage] = await Promise.all([
			page.context().waitForEvent('page'),
			page
				.getByRole('tooltip')
				.getByRole('button', { name: 'Open in New Tab' })
				.click(),
		]);

		await newPage.waitForLoadState();
		await expect(newPage).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await newPage.close();
	});

	test('TC-15 copy link copies the dashboard URL to the clipboard', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-copy';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page
			.context()
			.grantPermissions(['clipboard-read', 'clipboard-write']);

		await page.getByTestId('dashboard-action-icon').first().click();
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'Copy Link' })
			.click();

		await expect(page.getByText(/copied|success/i)).toBeVisible();

		const clipboardText = await page.evaluate(async () =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(globalThis as any).navigator.clipboard.readText(),
		);
		expect(clipboardText).toMatch(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-16 export JSON downloads the dashboard as a JSON file', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-export';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByTestId('dashboard-action-icon').first().click();

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page
				.getByRole('tooltip')
				.getByRole('button', { name: 'Export JSON' })
				.click(),
		]);

		expect(download.suggestedFilename()).toMatch(/\.json$/);
	});

	test('TC-17 action menu closes when clicking outside the popover', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-dismiss';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByTestId('dashboard-action-icon').first().click();
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

	test('TC-18 New dashboard dropdown shows exactly three options', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page.getByTestId('new-dashboard-cta').click();

		const menu = page.getByRole('menu');
		await expect(menu).toBeVisible();
		await expect(menu.getByTestId('create-dashboard-menu-cta')).toBeVisible();
		await expect(menu.getByTestId('import-json-menu-cta')).toBeVisible();
		await expect(menu.getByTestId('view-templates-menu-cta')).toBeVisible();
	});

	test('TC-19 Create dashboard dropdown option creates a dashboard with the default name', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('create-dashboard-menu-cta').click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await expect(
			page.getByText('Configure your new dashboard'),
		).toBeVisible();
		// "Configure" appears twice on the new-dashboard onboarding state — once
		// in the toolbar and once in the empty-state section. The test only
		// needs to confirm the onboarding rendered, so .first() is sufficient.
		await expect(
			page.getByRole('button', { name: 'Configure' }).first(),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /New Panel/ }).first(),
		).toBeVisible();

		// Register the UI-created dashboard with the suite teardown.
		const sampleId = await findDashboardIdByTitle(page, 'Sample Title');
		if (sampleId) {
			seedIds.add(sampleId);
		}
	});

	test('TC-20 Import JSON dialog opens with code editor and upload button', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
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

	test('TC-21 Import JSON dialog closes on Escape without creating a dashboard', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		// The Monaco editor inside the modal grabs focus on mount and swallows
		// Escape. Click the modal title first to blur Monaco; then Ant's Modal
		// `keyboard` handler picks up the Escape and dismisses the dialog.
		await dialog.getByText('Import Dashboard JSON').click();
		await page.keyboard.press('Escape');

		await expect(dialog).not.toBeVisible();
		await expect(page).toHaveURL(/\/dashboard($|\?)/);
	});

	test('TC-22 Import JSON dialog closes on clicking the close button', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.getByRole('button', { name: /close/i }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page).toHaveURL(/\/dashboard($|\?)/);
	});

	// ─── Deleting dashboards ─────────────────────────────────────────────────
	//
	// Known behaviour: clicking Cancel in the confirmation dialog navigates to
	// the dashboard detail page rather than staying on the list.

	test('TC-23 delete confirmation dialog shows dashboard name with Cancel and Delete buttons', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-confirm';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
		await page.getByTestId('dashboard-action-icon').first().click();
		// Ant's Popover positions the tooltip below the row — when the row is
		// near the viewport bottom the option ends up just off-screen. Force
		// the click; the element is already attached and Ant handles the rest.
		await page
			.getByRole('tooltip')
			.getByText('Delete dashboard')
			.click({ force: true });

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('heading')).toContainText(
			'Are you sure you want to delete the',
		);
		await expect(dialog.getByRole('heading')).toContainText(name);

		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible();
	});

	test('TC-24 cancelling delete navigates to the dashboard detail page (known behaviour)', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-cancel';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
		await page.getByTestId('dashboard-action-icon').first().click();
		// Ant's Popover positions the tooltip below the row — when the row is
		// near the viewport bottom the option ends up just off-screen. Force
		// the click; the element is already attached and Ant handles the rest.
		await page
			.getByRole('tooltip')
			.getByText('Delete dashboard')
			.click({ force: true });
		await expect(page.getByRole('dialog')).toBeVisible();

		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-25 confirming delete removes the dashboard from the list', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-confirmed';
		const id = await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

		await page.getByTestId('dashboard-action-icon').first().click();
		// Ant's Popover positions the tooltip below the row — when the row is
		// near the viewport bottom the option ends up just off-screen. Force
		// the click; the element is already attached and Ant handles the rest.
		await page
			.getByRole('tooltip')
			.getByText('Delete dashboard')
			.click({ force: true });

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
		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
		await expect(page.getByAltText('dashboard-image')).toHaveCount(0);

		// The UI delete already removed the resource — drop it from the
		// suite-cleanup set so afterAll doesn't 404 on it.
		seedIds.delete(id);
	});

	// ─── Row click navigation ────────────────────────────────────────────────

	test('TC-26 clicking a dashboard row navigates to the detail page', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-row-click';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByAltText('dashboard-image').first().click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
	});

	test('TC-27 dashboard detail page shows the breadcrumb after row click', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-breadcrumb';
		await createDashboard(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);

		await page.getByAltText('dashboard-image').first().click();
		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

		await expect(
			page.getByRole('button', { name: /Dashboard \// }),
		).toBeVisible();
	});

	test('TC-28 sidebar Dashboards link navigates to the list page', async ({
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

	test('TC-29 search term updates the URL in real time', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page
			.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
			.fill('realtime');
		await expect(page).toHaveURL(/search=realtime/);
	});

	test('TC-30 browser Back after navigating to a dashboard restores search state', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-back-search';
		await createDashboard(page, name);

		await page.goto(`/dashboard?search=${name}`);
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });

		await page.getByAltText('dashboard-image').first().click();
		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

		await page.goBack();
		await expect(page).toHaveURL(new RegExp(`search=${name}`));
		await expect(
			page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }),
		).toHaveValue(name);
	});

	test('TC-31 sort params appear in URL only after interacting with the sort button', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await expect(page).not.toHaveURL(/columnKey/);

		await page.getByTestId('sort-by').click();
		await page.getByTestId('sort-by-last-updated').click();
		await expect(page).toHaveURL(/columnKey=updatedAt/);
		await expect(page).toHaveURL(/order=descend/);

		// Direct navigation with sort params should honour them on load.
		await page.goto('/dashboard?columnKey=updatedAt&order=descend');
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });
		await expect(page).toHaveURL(/columnKey=updatedAt/);
		await expect(page).toHaveURL(/order=descend/);
	});

	// ─── Page header actions ─────────────────────────────────────────────────

	test('TC-32 feedback button is visible and stays on the page when clicked', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		const feedback = page.getByRole('button', { name: 'Feedback' });
		await expect(feedback).toBeVisible();

		await feedback.click();
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('TC-33 share button is visible and stays on the page when clicked', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		const share = page.getByRole('button', { name: 'Share' });
		await expect(share).toBeVisible();

		await share.click();
		await expect(page).toHaveURL(/\/dashboard/);
	});
});
