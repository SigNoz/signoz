import path from 'path';
import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	APM_METRICS_TITLE,
	authToken,
	configureAndSavePanel,
	createDashboardViaApi,
	deleteDashboardViaApi,
	fetchDashboardData,
	gotoDashboardsList,
	openDashboardSettingsDrawer,
	renameDashboardViaToolbar,
	SEARCH_PLACEHOLDER,
} from '../../helpers/dashboards';

// All tests mutate dashboard state (create / rename / delete). Run serially to
// prevent cross-test interference on the list and detail pages.
test.describe.configure({ mode: 'serial' });

// ─── Suite-level seed registry ────────────────────────────────────────────────
//
// Every dashboard created by any test is registered here; one afterAll tears
// them all down. Tests that don't create anything (TC-10, TC-11, TC-13) need
// no cleanup entry.
const seedIds = new Set<string>();
const BASE_FIXTURE_TITLE = 'create-flow-base-fixture';

const APM_METRICS_TESTDATA_PATH = path.resolve(
	__dirname,
	'../../testdata/apm-metrics.json',
);

async function seed(page: Page, title: string): Promise<string> {
	const id = await createDashboardViaApi(page, title);
	seedIds.add(id);
	return id;
}

test.beforeAll(async ({ browser }) => {
	// Seed one base dashboard so the list is non-empty and the
	// `new-dashboard-cta` header button is rendered for all tests that
	// drive the "New dashboard" dropdown from the list page.
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		seedIds.add(await createDashboardViaApi(page, BASE_FIXTURE_TITLE));
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) return;
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of [...seedIds]) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboard Create Flow', () => {
	// ─── 1. Create Dashboard (blank) ─────────────────────────────────────────

	test('TC-01 blank create lands on onboarding state with correct default title', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);

		const postResponse = page.waitForResponse(
			(r) =>
				r.request().method() === 'POST' && /\/api\/v1\/dashboards/.test(r.url()),
		);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('create-dashboard-menu-cta').click();
		const res = await postResponse;

		await page.waitForURL(/\/dashboard\/[0-9a-f-]+/);

		expect(res.status()).toBeGreaterThanOrEqual(200);
		expect(res.status()).toBeLessThan(300);

		// Request contract: UI must POST the default title + uploadedGrafana=false.
		// Catches regressions where the menu CTA silently changes the create payload.
		const reqBody = res.request().postDataJSON() as {
			title?: string;
			uploadedGrafana?: boolean;
		};
		expect(reqBody.title).toBe('Sample Title');
		expect(reqBody.uploadedGrafana).toBe(false);

		const body = (await res.json()) as {
			data: { data: { title: string }; id: string };
		};
		expect(body.data.data.title).toBe('Sample Title');

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		// DashboardDescription always renders dashboard-title even on blank dashboards.
		await expect(page.getByTestId('dashboard-title')).toHaveText('Sample Title');
		await expect(page.getByText('Welcome to your new dashboard')).toBeVisible();
		await expect(page.getByText('Configure your new dashboard')).toBeVisible();
		await expect(page.getByTestId('show-drawer').first()).toBeVisible();
		await expect(page.getByTestId('add-panel')).toBeVisible();

		// Register the UI-created dashboard for cleanup.
		const id = body.data.id;
		expect(id, 'POST response must include a dashboard id').toBeTruthy();
		seedIds.add(id);
	});

	test('TC-02 configure drawer opens with Overview tab and pre-fills existing title', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc02');
		await page.goto(`/dashboard/${id}`);

		const drawer = await openDashboardSettingsDrawer(page);

		// Overview tab is the default active tab.
		await expect(drawer.getByRole('button', { name: 'Overview' })).toBeVisible();

		const nameInput = drawer.getByTestId('dashboard-name');
		await expect(nameInput).toHaveValue('create-flow-tc02');

		const descInput = drawer.getByTestId('dashboard-desc');
		await expect(descInput).toBeVisible();
		await expect(descInput).toHaveValue('');

		await expect(
			drawer.getByPlaceholder('Start typing your tag name'),
		).toBeVisible();

		// Ant Drawer does not close on Escape — use the X close button in the header.
		await drawer.getByRole('button', { name: 'Close' }).click();
		await expect(drawer).not.toHaveClass(/ant-drawer-open/);
	});

	test('TC-03 rename title, add description and tags, save persists to list', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc03-original');
		await page.goto(`/dashboard/${id}`);

		const drawer = await openDashboardSettingsDrawer(page);

		const nameInput = drawer.getByTestId('dashboard-name');
		await nameInput.clear();
		await nameInput.fill('create-flow-tc03-renamed');
		await expect(drawer.getByText(/1 unsaved change/)).toBeVisible();

		await drawer.getByTestId('dashboard-desc').fill('A test description');
		await expect(drawer.getByText(/2 unsaved changes/)).toBeVisible();

		const tagInput = drawer.getByPlaceholder('Start typing your tag name');
		await tagInput.click();
		await tagInput.fill('e2e-tag');
		await page.keyboard.press('Enter');
		await expect(drawer.getByText(/3 unsaved changes/)).toBeVisible();

		// Click save, capture the PUT, and verify it carried all three fields.
		const putResponse = page.waitForResponse(
			(r) =>
				r.request().method() === 'PUT' &&
				new RegExp(`/api/v1/dashboards/${id}$`).test(r.url()),
		);
		await page.getByTestId('save-dashboard-config').click();
		const putRes = await putResponse;
		expect(putRes.status()).toBeGreaterThanOrEqual(200);
		expect(putRes.status()).toBeLessThan(300);

		// Server-side state must match what the user typed. UI-only checks pass
		// on optimistic-update bugs; this catches them.
		const persisted = await fetchDashboardData(page, id);
		expect(persisted.title).toBe('create-flow-tc03-renamed');
		expect(persisted.description).toBe('A test description');
		expect(persisted.tags ?? []).toContain('e2e-tag');

		// Footer clears only after the PUT success callback re-syncs local state.
		await expect(drawer.getByText(/unsaved change/)).not.toBeVisible();

		await drawer.getByRole('button', { name: 'Close' }).click();

		// Renamed dashboard appears in the list.
		await gotoDashboardsList(page);
		const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER);
		await searchInput.fill('create-flow-tc03-renamed');
		await expect(page.getByText('create-flow-tc03-renamed').first()).toBeVisible();

		// Tag search also surfaces the renamed dashboard.
		await searchInput.fill('e2e-tag');
		await expect(page.getByText('create-flow-tc03-renamed').first()).toBeVisible();
	});

	test('TC-04 discard reverts unsaved changes without API call', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc04');
		await page.goto(`/dashboard/${id}`);

		const drawer = await openDashboardSettingsDrawer(page);

		const nameInput = drawer.getByTestId('dashboard-name');
		await nameInput.clear();
		await nameInput.fill('create-flow-tc04-discarded');
		await drawer.getByTestId('dashboard-desc').fill('discarded desc');
		await expect(drawer.getByText(/unsaved change/)).toBeVisible();

		// Intercept any PUT to detect an unwanted save.
		let patchFired = false;
		await page.route(/\/api\/v1\/dashboards\//, (route) => {
			if (route.request().method() === 'PUT') {
				patchFired = true;
			}
			route.continue();
		});

		await drawer.getByRole('button', { name: 'Discard' }).click();

		await expect(drawer.getByText(/unsaved change/)).not.toBeVisible();
		await expect(nameInput).toHaveValue('create-flow-tc04');
		await expect(drawer.getByTestId('dashboard-desc')).toHaveValue('');

		// Settle before asserting "no PUT fired" — a delayed save request that
		// races past the UI revert would otherwise sneak past the check.
		await page.waitForLoadState('networkidle');
		expect(patchFired).toBe(false);
	});

	test('TC-05 rename via toolbar options popover persists to the toolbar title', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc05');
		await page.goto(`/dashboard/${id}`);

		// DashboardDescription toolbar always renders — even on blank dashboards.
		await expect(page.getByTestId('options')).toBeVisible();

		await renameDashboardViaToolbar(page, 'create-flow-tc05-renamed');

		await expect(page.getByTestId('dashboard-title')).toHaveText(
			'create-flow-tc05-renamed',
		);

		// Server-side persistence — toolbar rename uses a separate PUT path from
		// the settings drawer; this catches an optimistic-update regression.
		const persisted = await fetchDashboardData(page, id);
		expect(persisted.title).toBe('create-flow-tc05-renamed');

		// List view reflects the rename after navigating back.
		await gotoDashboardsList(page);
		await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('create-flow-tc05-renamed');
		await expect(page.getByText('create-flow-tc05-renamed').first()).toBeVisible();
	});

	// ─── 2. Variables ─────────────────────────────────────────────────────────

	test('TC-06 add a Custom variable, verify it appears in the variables bar', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc06');
		await page.goto(`/dashboard/${id}`);

		const drawer = await openDashboardSettingsDrawer(page);
		await drawer.getByRole('button', { name: 'Variables' }).click();

		await drawer.getByTestId('add-new-variable').click();
		await expect(drawer.getByRole('button', { name: 'All variables' })).toBeVisible();

		await drawer
			.getByPlaceholder('Unique name of the variable')
			.fill('env');

		await drawer.getByRole('button', { name: 'Custom' }).click();

		// After selecting "Custom" type, the Options collapse panel contains a
		// textarea with placeholder "Enter options separated by commas."
		const customInput = drawer.getByPlaceholder(
			'Enter options separated by commas.',
		);
		await customInput.fill('prod,staging,dev');

		const patchResponse = page.waitForResponse(
			(r) =>
				r.request().method() === 'PUT' && /\/api\/v1\/dashboards\//.test(r.url()),
		);
		await drawer.getByRole('button', { name: 'Save Variable' }).click();
		const res = await patchResponse;
		expect(res.status()).toBeGreaterThanOrEqual(200);
		expect(res.status()).toBeLessThan(300);

		// After saving, the variable form disappears and the table row is visible.
		await expect(drawer.getByRole('button', { name: 'All variables' })).not.toBeVisible();
		await expect(drawer.getByText('env')).toBeVisible();

		// Server-side persistence — the variable record must land in the dashboard JSON.
		const persisted = await fetchDashboardData(page, id);
		const persistedVars = Object.values(persisted.variables ?? {}) as Array<{
			name?: string;
			customValue?: string;
			type?: string;
		}>;
		const envVar = persistedVars.find((v) => v.name === 'env');
		expect(envVar, 'env variable must be persisted on the dashboard').toBeTruthy();
		expect(envVar?.customValue).toBe('prod,staging,dev');

		// Close the drawer via its X button and check the variables bar renders the
		// variable label. `.dashboard-variables` always exists once any variable
		// is defined; assert it contains `$env` (the rendered prefix from
		// VariableItem) so an empty-bar regression is caught.
		await drawer.getByRole('button', { name: 'Close' }).click();
		const varsBar = page.locator('.dashboard-variables');
		await expect(varsBar).toBeVisible();
		await expect(varsBar).toContainText('$env');
	});

	test('TC-07 duplicate variable name is rejected inline', async ({
		authedPage: page,
	}) => {
		// Seed a dashboard that already has a variable named 'env'.
		const id = await seed(page, 'create-flow-tc07');
		await page.goto(`/dashboard/${id}`);

		// Use the UI to add the first variable so the state is real.
		const drawer = await openDashboardSettingsDrawer(page);
		await drawer.getByRole('button', { name: 'Variables' }).click();
		await drawer.getByTestId('add-new-variable').click();
		await drawer.getByPlaceholder('Unique name of the variable').fill('env');
		await drawer.getByRole('button', { name: 'Custom' }).click();
		await drawer
			.getByPlaceholder('Enter options separated by commas.')
			.fill('prod');
		const firstSave = page.waitForResponse(
			(r) =>
				r.request().method() === 'PUT' && /\/api\/v1\/dashboards\//.test(r.url()),
		);
		await drawer.getByRole('button', { name: 'Save Variable' }).click();
		await firstSave;

		// Now try to add a second variable with the same name.
		await drawer.getByTestId('add-new-variable').click();
		const nameInput = drawer.getByPlaceholder('Unique name of the variable');
		await nameInput.fill('env');

		await expect(
			drawer.getByText('Variable name already exists'),
		).toBeVisible();
		await expect(
			drawer.getByRole('button', { name: 'Save Variable' }),
		).toBeDisabled();
	});

	// ─── 3. Import JSON ───────────────────────────────────────────────────────
	//
	// TC-08 and TC-12 are merged: TC-08 covers the POST contract and navigation;
	// the merged test also navigates back to the list and verifies metadata
	// surfacing (the TC-12 concern). This avoids two identical import flows.

	test('TC-08 import via file upload creates dashboard, navigates to detail, and surfaces metadata in list', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page.getByRole('dialog').filter({ hasText: 'Import Dashboard JSON' });
		await expect(dialog).toBeVisible();

		const postResponse = page.waitForResponse(
			(r) =>
				r.request().method() === 'POST' && /\/api\/v1\/dashboards/.test(r.url()),
		);
		await dialog.locator('input[type="file"]').setInputFiles(APM_METRICS_TESTDATA_PATH);
		await dialog.getByRole('button', { name: 'Import and Next' }).click();
		const res = await postResponse;

		expect(res.status()).toBeGreaterThanOrEqual(200);
		expect(res.status()).toBeLessThan(300);

		await page.waitForURL(/\/dashboard\/[0-9a-f-]+/);

		// Register for cleanup.
		const urlMatch = page.url().match(/\/dashboard\/([0-9a-f-]+)/);
		expect(urlMatch, 'URL must contain dashboard ID').not.toBeNull();
		seedIds.add(urlMatch![1]);

		await expect(page.getByTestId('dashboard-title')).toHaveText(APM_METRICS_TITLE);

		// Server-side check: every widget + tag from the fixture must be persisted.
		// A partial import (e.g. silently dropped widgets) would pass the UI title
		// check but fail here. The apm-metrics fixture has 16 widgets and 4 tags.
		const persisted = await fetchDashboardData(page, urlMatch![1]);
		expect(persisted.widgets?.length).toBe(16);
		expect(persisted.tags).toEqual(
			expect.arrayContaining(['apm', 'latency', 'error rate', 'throughput']),
		);

		// Navigate back and confirm the imported dashboard surfaces in the list
		// with at least one tag chip (TC-12 coverage).
		await gotoDashboardsList(page);
		await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(APM_METRICS_TITLE);
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
		// The apm-metrics fixture has tags ['apm', 'latency', 'error rate', 'throughput'].
		await expect(page.getByText('apm').first()).toBeVisible();
	});

	// TC-09 (Monaco paste path) is intentionally dropped — the file-upload
	// path (TC-08) exercises the same populate-editor-then-import code path.
	// Keyboard-typing large JSON into Monaco is unreliable in headless CI.

	test('TC-10 invalid JSON via file upload shows "Invalid JSON" error', async ({
		authedPage: page,
	}) => {
		// No dashboard is created by this test — no cleanup entry needed.
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page.getByRole('dialog').filter({ hasText: 'Import Dashboard JSON' });
		await expect(dialog).toBeVisible();

		// Track POST attempts: invalid JSON must never reach the create endpoint.
		let postFired = false;
		await page.route(/\/api\/v1\/dashboards(\?|$)/, (route) => {
			if (route.request().method() === 'POST') {
				postFired = true;
			}
			route.continue();
		});

		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'bad.json',
			mimeType: 'application/json',
			buffer: Buffer.from('not valid json {'),
		});

		await expect(dialog.getByText('Invalid JSON')).toBeVisible();
		await expect(dialog).toBeVisible();

		// Clicking "Import and Next" with invalid content should surface an error
		// and keep the dialog open.
		await dialog.getByRole('button', { name: 'Import and Next' }).click();
		await expect(page).not.toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await expect(dialog).toBeVisible();

		await page.waitForLoadState('networkidle');
		expect(postFired, 'invalid JSON must not trigger POST').toBe(false);
	});

	test('TC-11 import with empty editor clicking Import and Next shows error', async ({
		authedPage: page,
	}) => {
		// No dashboard is created — no cleanup entry needed.
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page.getByRole('dialog').filter({ hasText: 'Import Dashboard JSON' });
		await expect(dialog).toBeVisible();

		let postFired = false;
		await page.route(/\/api\/v1\/dashboards(\?|$)/, (route) => {
			if (route.request().method() === 'POST') {
				postFired = true;
			}
			route.continue();
		});

		await dialog.getByRole('button', { name: 'Import and Next' }).click();

		await expect(dialog.getByText('Error loading JSON file')).toBeVisible();
		await expect(dialog).toBeVisible();
		await expect(page).not.toHaveURL(/\/dashboard\/[0-9a-f-]+/);

		await page.waitForLoadState('networkidle');
		expect(postFired, 'empty editor must not trigger POST').toBe(false);
	});

	// ─── 4. View Templates ────────────────────────────────────────────────────

	test('TC-13 New Dashboard dropdown has the three expected entries, View templates is an external link', async ({
		authedPage: page,
	}) => {
		// No dashboard is created — no cleanup entry needed.
		// The assertion guards against silent additions or reorderings to the
		// dropdown (adds, removals, label rename) AND the link being changed to
		// an in-app modal or a different URL (the DashboardTemplatesModal exists
		// in source but is never triggered from this menu item).
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();

		// All three CTAs must render, with the expected labels.
		await expect(page.getByTestId('create-dashboard-menu-cta')).toHaveText(
			/Create dashboard/i,
		);
		await expect(page.getByTestId('import-json-menu-cta')).toHaveText(/Import JSON/i);

		const link = page.getByTestId('view-templates-menu-cta');
		await expect(link).toHaveText(/View templates/i);

		await expect(link).toHaveAttribute(
			'href',
			/signoz\.io\/docs\/dashboards\/dashboard-templates/,
		);
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', /noopener/);
	});

	// ─── 5. Post-Create Dashboard Detail — Panel Addition ────────────────────

	test('TC-14 New Panel modal opens and selecting Time Series navigates to widget editor', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc14');
		await page.goto(`/dashboard/${id}`);

		await expect(page.getByText('Welcome to your new dashboard')).toBeVisible();

		await page.getByTestId('add-panel').click();
		// PANEL_TYPES enum: TIME_SERIES='graph', VALUE='value', TABLE='table'
		// — the testid is panel-type-<enum-value>, not panel-type-<enum-name>.
		const modal = page.getByRole('dialog').filter({ hasText: 'New Panel' });
		await expect(modal).toBeVisible();

		await expect(modal.getByTestId('panel-type-graph')).toBeVisible();
		await expect(modal.getByTestId('panel-type-value')).toBeVisible();
		await expect(modal.getByTestId('panel-type-table')).toBeVisible();

		await modal.getByTestId('panel-type-graph').click();
		await expect(page).toHaveURL(/graphType=graph/);

		// Confirm the widget editor actually loaded — URL-only checks pass even
		// if the route resolves to a blank/broken page.
		await expect(page.getByTestId('new-widget-save')).toBeVisible();
		await expect(page.getByTestId('panel-name-input')).toBeVisible();
	});

	test('TC-15 New Panel button from toolbar header opens the same panel type modal', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc15');
		await page.goto(`/dashboard/${id}`);

		// The toolbar "New Panel" button (add-panel-header) is present even on
		// a blank dashboard, alongside the empty-state "add-panel" button.
		await expect(page.getByTestId('add-panel-header')).toBeVisible();
		await page.getByTestId('add-panel-header').click();

		const modal = page.getByRole('dialog').filter({ hasText: 'New Panel' });
		await expect(modal).toBeVisible();
		await expect(modal.getByTestId('panel-type-graph')).toBeVisible();

		// Click the modal X button to close (Escape also works but may conflict
		// with the Enterprise modal in the background; explicit click is more reliable).
		await modal.getByRole('button', { name: 'Close' }).click();
		await expect(modal).not.toBeVisible();
	});

	// ─── 6. Cancellation and Navigation Away ─────────────────────────────────

	test('TC-16 browser Back from dashboard detail returns to list with URL preserved', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc16');

		await page.goto(`/dashboard?search=create-flow-tc16`);
		await page
			.getByRole('heading', { name: 'Dashboards', level: 1 })
			.waitFor({ state: 'visible' });

		await page.getByAltText('dashboard-image').first().click();
		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

		await page.goBack();
		await expect(page).toHaveURL(/search=create-flow-tc16/);
		await expect(
			page.getByPlaceholder(SEARCH_PLACEHOLDER),
		).toHaveValue('create-flow-tc16');
	});

	test('TC-17 navigating away with the settings drawer open does not crash', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc17');
		await page.goto(`/dashboard/${id}`);

		await openDashboardSettingsDrawer(page);

		// Navigate away without closing the drawer.
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard($|\?)/);
		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
		// No error overlay should be present.
		await expect(
			page.getByRole('alert').filter({ hasText: /error/i }),
		).toHaveCount(0);
	});

	// ─── 7. Add Panel — end-to-end per signal ────────────────────────────────
	//
	// TC-14/TC-15 verify the New Panel modal opens and routes to the widget
	// editor. The TCs below go further: configure a query for each signal
	// using values from testdata/queries.json, save the panel, return to the
	// dashboard, and verify the panel card renders.

	test('TC-18 add metrics Time Series panel using signoz_calls_total from queries.json', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'add-panel-metrics');
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByTestId('add-panel')).toBeVisible();

		await configureAndSavePanel(page, 'metrics', 'metrics-timeseries');

		await expect(page.getByTestId('metrics-timeseries')).toBeVisible();

		// Reload — proves the panel persists, not just optimistic UI from the save.
		await page.reload();
		await expect(page.getByTestId('metrics-timeseries')).toBeVisible();
	});

	test('TC-19 add logs Time Series panel with default query from queries.json', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'add-panel-logs');
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByTestId('add-panel')).toBeVisible();

		await configureAndSavePanel(page, 'logs', 'logs-timeseries');

		await expect(page.getByTestId('logs-timeseries')).toBeVisible();

		await page.reload();
		await expect(page.getByTestId('logs-timeseries')).toBeVisible();
	});

	test('TC-20 add traces Time Series panel with default query from queries.json', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'add-panel-traces');
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByTestId('add-panel')).toBeVisible();

		await configureAndSavePanel(page, 'traces', 'traces-timeseries');

		await expect(page.getByTestId('traces-timeseries')).toBeVisible();

		await page.reload();
		await expect(page.getByTestId('traces-timeseries')).toBeVisible();
	});

	// ─── 8. Destructive CRUD ─────────────────────────────────────────────────

	test('TC-21 delete dashboard via list action menu removes it from the list', async ({
		authedPage: page,
	}) => {
		// Seed with a unique title so the list filter resolves to exactly one row.
		const targetTitle = 'create-flow-tc21-to-delete';
		const id = await createDashboardViaApi(page, targetTitle);
		// Intentionally not registered in seedIds — this test deletes it via UI.

		await gotoDashboardsList(page);
		await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(targetTitle);
		await expect(page.getByText(targetTitle).first()).toBeVisible();

		// Open the row action menu (tooltip with action buttons).
		const icon = page.getByTestId('dashboard-action-icon').first();
		await icon.scrollIntoViewIfNeeded();
		await icon.click();
		const tooltip = page.getByRole('tooltip');
		await tooltip.getByRole('button', { name: /Delete Dashboard/i }).click();

		// Confirm modal: title contains the dashboard name + a danger "Delete" button.
		const confirmModal = page
			.getByRole('dialog')
			.filter({ hasText: 'Are you sure you want to delete' });
		await expect(confirmModal).toBeVisible();
		await expect(confirmModal).toContainText(targetTitle);

		const deleteResponse = page.waitForResponse(
			(r) =>
				r.request().method() === 'DELETE' &&
				new RegExp(`/api/v1/dashboards/${id}`).test(r.url()),
		);
		await confirmModal.getByRole('button', { name: /^Delete$/ }).click();
		const delRes = await deleteResponse;
		expect(delRes.status()).toBeGreaterThanOrEqual(200);
		expect(delRes.status()).toBeLessThan(300);

		// Row should disappear from the list. The search is still active, so the
		// list shows its empty-search state with a "No dashboards found for X"
		// message — assert that explicitly rather than the row's absence (the
		// title also lives in the search input value and the empty-state message).
		await expect(
			page.getByText(`No dashboards found for ${targetTitle}`),
		).toBeVisible();

		// API confirms the row is gone — guards against an optimistic-update bug
		// where the UI hides the row without the backend actually deleting it.
		const token = await authToken(page);
		const verifyRes = await page.request.get(`/api/v1/dashboards/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(verifyRes.status()).toBe(404);
	});

	// ─── 9. Full Round-Trip ──────────────────────────────────────────────────
	//
	// Catches cross-feature regressions: a settings save that nukes variables,
	// a variable add that strips widgets, a panel save that overwrites tags, etc.
	// Stress-tests the dashboard PUT contract by writing every editable surface.

	test('TC-22 settings + variable + panel survive a hard reload', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc22');
		await page.goto(`/dashboard/${id}`);

		// 1. Settings drawer: rename + description + tag.
		let drawer = await openDashboardSettingsDrawer(page);
		await drawer.getByTestId('dashboard-name').clear();
		await drawer.getByTestId('dashboard-name').fill('create-flow-tc22-roundtrip');
		await drawer.getByTestId('dashboard-desc').fill('round trip description');
		const tagInput = drawer.getByPlaceholder('Start typing your tag name');
		await tagInput.click();
		await tagInput.fill('roundtrip-tag');
		await page.keyboard.press('Enter');
		await page.getByTestId('save-dashboard-config').click();
		await expect(drawer.getByText(/unsaved change/)).not.toBeVisible();

		// 2. Variable tab — add a Custom variable.
		await drawer.getByRole('button', { name: 'Variables' }).click();
		await drawer.getByTestId('add-new-variable').click();
		await drawer.getByPlaceholder('Unique name of the variable').fill('region');
		await drawer.getByRole('button', { name: 'Custom' }).click();
		await drawer
			.getByPlaceholder('Enter options separated by commas.')
			.fill('us,eu,ap');
		const varSave = page.waitForResponse(
			(r) =>
				r.request().method() === 'PUT' && /\/api\/v1\/dashboards\//.test(r.url()),
		);
		await drawer.getByRole('button', { name: 'Save Variable' }).click();
		await varSave;
		await drawer.getByRole('button', { name: 'Close' }).click();

		// 3. Add a metrics panel.
		await configureAndSavePanel(page, 'metrics', 'tc22-metrics');
		await expect(page.getByTestId('tc22-metrics')).toBeVisible();

		// 4. Hard reload — assert everything persisted across a fresh fetch.
		await page.reload();
		await expect(page.getByTestId('dashboard-title')).toHaveText(
			'create-flow-tc22-roundtrip',
		);
		await expect(page.locator('.dashboard-variables')).toContainText('$region');
		await expect(page.getByTestId('tc22-metrics')).toBeVisible();

		// 5. Server confirmation — every change is in the persisted JSON.
		const persisted = await fetchDashboardData(page, id);
		expect(persisted.title).toBe('create-flow-tc22-roundtrip');
		expect(persisted.description).toBe('round trip description');
		expect(persisted.tags ?? []).toContain('roundtrip-tag');
		expect(persisted.widgets?.length).toBe(1);
		const persistedVars = Object.values(persisted.variables ?? {}) as Array<{
			name?: string;
		}>;
		expect(persistedVars.map((v) => v.name)).toContain('region');
	});
});
