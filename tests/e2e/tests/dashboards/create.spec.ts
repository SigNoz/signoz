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
// them all down. Tests that don't create anything (TC-04, TC-05) need no
// cleanup entry.
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
		for (const id of seedIds) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboard Create Flow', () => {
	// ─── 1. Rename via toolbar ───────────────────────────────────────────────
	// Blank-create coverage lives in list.spec.ts (TC-16); this file picks up
	// at the rename step.

	test('TC-02 rename via toolbar options popover persists to the toolbar title', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc02');
		await page.goto(`/dashboard/${id}`);

		// DashboardDescription toolbar always renders — even on blank dashboards.
		await expect(page.getByTestId('options')).toBeVisible();

		await renameDashboardViaToolbar(page, 'create-flow-tc02-renamed');

		await expect(page.getByTestId('dashboard-title')).toHaveText(
			'create-flow-tc02-renamed',
		);

		// Server-side persistence — toolbar rename uses a separate PUT path from
		// the settings drawer; this catches an optimistic-update regression.
		const persisted = await fetchDashboardData(page, id);
		expect(persisted.title).toBe('create-flow-tc02-renamed');

		// List view reflects the rename after navigating back.
		await gotoDashboardsList(page);
		await page
			.getByPlaceholder(SEARCH_PLACEHOLDER)
			.fill('create-flow-tc02-renamed');
		await expect(
			page.getByText('create-flow-tc02-renamed').first(),
		).toBeVisible();
	});

	// ─── 2. Import JSON ───────────────────────────────────────────────────────
	//
	// TC-03 covers the POST contract, navigation, and metadata surfacing on
	// the list — one flow rather than two near-identical imports.

	test('TC-03 import via file upload creates dashboard, navigates to detail, and surfaces metadata in list', async ({
		authedPage: page,
	}) => {
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page
			.getByRole('dialog')
			.filter({ hasText: 'Import Dashboard JSON' });
		await expect(dialog).toBeVisible();

		const postResponse = page.waitForResponse(
			(r) =>
				r.request().method() === 'POST' && /\/api\/v1\/dashboards/.test(r.url()),
		);
		await dialog
			.locator('input[type="file"]')
			.setInputFiles(APM_METRICS_TESTDATA_PATH);
		await dialog.getByRole('button', { name: 'Import and Next' }).click();
		const res = await postResponse;

		expect(res.status()).toBeGreaterThanOrEqual(200);
		expect(res.status()).toBeLessThan(300);

		await page.waitForURL(/\/dashboard\/[0-9a-f-]+/);

		// Register for cleanup.
		const urlMatch = page.url().match(/\/dashboard\/([0-9a-f-]+)/);
		expect(urlMatch, 'URL must contain dashboard ID').not.toBeNull();
		seedIds.add(urlMatch![1]);

		await expect(page.getByTestId('dashboard-title')).toHaveText(
			APM_METRICS_TITLE,
		);

		// Server-side check: every widget + tag from the fixture must be persisted.
		// A partial import (e.g. silently dropped widgets) would pass the UI title
		// check but fail here. The apm-metrics fixture has 16 widgets and 4 tags.
		const persisted = await fetchDashboardData(page, urlMatch![1]);
		expect(persisted.widgets?.length).toBe(16);
		expect(persisted.tags).toEqual(
			expect.arrayContaining(['apm', 'latency', 'error rate', 'throughput']),
		);

		// Navigate back and confirm the imported dashboard surfaces in the list
		// with at least one tag chip.
		await gotoDashboardsList(page);
		await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(APM_METRICS_TITLE);
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
		// The apm-metrics fixture has tags ['apm', 'latency', 'error rate', 'throughput'].
		await expect(page.getByText('apm').first()).toBeVisible();
	});

	// The Monaco paste path is intentionally not covered — the file-upload
	// path (TC-03) exercises the same populate-editor-then-import code path.
	// Keyboard-typing large JSON into Monaco is unreliable in headless CI.

	test('TC-04 invalid JSON via file upload shows "Invalid JSON" error', async ({
		authedPage: page,
	}) => {
		// No dashboard is created by this test — no cleanup entry needed.
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page
			.getByRole('dialog')
			.filter({ hasText: 'Import Dashboard JSON' });
		await expect(dialog).toBeVisible();

		// Track POST attempts: invalid JSON must never reach the create endpoint.
		let postFired = false;
		await page.route(/\/api\/v1\/dashboards(\?|$)/, (route) => {
			if (route.request().method() === 'POST') {
				postFired = true;
			}
			void route.continue();
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

	test('TC-05 import with empty editor clicking Import and Next shows error', async ({
		authedPage: page,
	}) => {
		// No dashboard is created — no cleanup entry needed.
		await gotoDashboardsList(page);
		await page.getByTestId('new-dashboard-cta').click();
		await page.getByTestId('import-json-menu-cta').click();

		const dialog = page
			.getByRole('dialog')
			.filter({ hasText: 'Import Dashboard JSON' });
		await expect(dialog).toBeVisible();

		let postFired = false;
		await page.route(/\/api\/v1\/dashboards(\?|$)/, (route) => {
			if (route.request().method() === 'POST') {
				postFired = true;
			}
			void route.continue();
		});

		await dialog.getByRole('button', { name: 'Import and Next' }).click();

		await expect(dialog.getByText('Error loading JSON file')).toBeVisible();
		await expect(dialog).toBeVisible();
		await expect(page).not.toHaveURL(/\/dashboard\/[0-9a-f-]+/);

		await page.waitForLoadState('networkidle');
		expect(postFired, 'empty editor must not trigger POST').toBe(false);
	});

	// ─── 3. Cancellation and Navigation Away ─────────────────────────────────
	// View-templates dropdown coverage lives in list.spec.ts (TC-15); browser
	// Back behaviour is covered by list.spec.ts (TC-24).

	test('TC-08 navigating away with the settings drawer open does not crash', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc08');
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

	// ─── 4. Add Panel — end-to-end per signal ────────────────────────────────
	//
	// The New Panel modal + widget-editor entry point is covered in
	// `details/35-add-panel.spec.ts`. The TCs below go further: configure a
	// query for each signal using values from testdata/queries.json, save the
	// panel, return to the dashboard, and verify the panel card renders.

	test('TC-09 add metrics Time Series panel using signoz_calls_total from queries.json', async ({
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

	test('TC-10 add logs Time Series panel with default query from queries.json', async ({
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

	test('TC-11 add traces Time Series panel with default query from queries.json', async ({
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

	// ─── 5. Full Round-Trip ──────────────────────────────────────────────────
	//
	// Delete-via-list coverage lives in list.spec.ts (TC-21).
	//
	// Catches cross-feature regressions: a settings save that nukes variables,
	// a variable add that strips widgets, a panel save that overwrites tags, etc.
	// Stress-tests the dashboard PUT contract by writing every editable surface.

	test('TC-13 settings + variable + panel survive a hard reload', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'create-flow-tc13');
		await page.goto(`/dashboard/${id}`);

		// 1. Settings drawer: rename + description + tag.
		const drawer = await openDashboardSettingsDrawer(page);
		await drawer.getByTestId('dashboard-name').clear();
		await drawer.getByTestId('dashboard-name').fill('create-flow-tc13-roundtrip');
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
		await configureAndSavePanel(page, 'metrics', 'tc13-metrics');
		await expect(page.getByTestId('tc13-metrics')).toBeVisible();

		// 4. Hard reload — assert everything persisted across a fresh fetch.
		await page.reload();
		await expect(page.getByTestId('dashboard-title')).toHaveText(
			'create-flow-tc13-roundtrip',
		);
		await expect(page.locator('.dashboard-variables')).toContainText('$region');
		await expect(page.getByTestId('tc13-metrics')).toBeVisible();

		// 5. Server confirmation — every change is in the persisted JSON.
		const persisted = await fetchDashboardData(page, id);
		expect(persisted.title).toBe('create-flow-tc13-roundtrip');
		expect(persisted.description).toBe('round trip description');
		expect(persisted.tags ?? []).toContain('roundtrip-tag');
		expect(persisted.widgets?.length).toBe(1);
		const persistedVars = Object.values(persisted.variables ?? {}) as Array<{
			name?: string;
		}>;
		expect(persistedVars.map((v) => v.name)).toContain('region');
	});
});
