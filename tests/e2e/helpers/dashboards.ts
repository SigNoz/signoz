import path from 'path';

import type { APIRequestContext, Locator, Page } from '@playwright/test';

import apmMetricsTemplate from '../testdata/apm-metrics.json';

// ─── Constants ───────────────────────────────────────────────────────────
//
// UI strings and well-known values referenced both within this file and by
// specs. Centralised here so a copy-edit in the app updates one place.

export const DASHBOARDS_LIST_PATH = '/dashboard';
export const SEARCH_PLACEHOLDER = 'Search by name, description, or tags...';
export const LIST_HEADING = 'Dashboards';

/** Title the "Create dashboard" dropdown option assigns by default. */
export const DEFAULT_DASHBOARD_TITLE = 'Sample Title';

/** Title of the APM Metrics dashboard imported from the JSON test fixture. */
export const APM_METRICS_TITLE = (apmMetricsTemplate as { title: string })
	.title;

const APM_METRICS_TESTDATA_PATH = path.resolve(
	__dirname,
	'../testdata/apm-metrics.json',
);

// ─── Auth ────────────────────────────────────────────────────────────────

/**
 * Read the JWT the auth fixture stored in `localStorage.AUTH_TOKEN`. The
 * page must be on the SigNoz origin first; if not, this navigates to the
 * dashboards list to populate localStorage from the context's storageState.
 */
export async function authToken(page: Page): Promise<string> {
	if (!page.url().startsWith('http')) {
		await page.goto(DASHBOARDS_LIST_PATH);
	}
	return page.evaluate(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		() => (globalThis as any).localStorage.getItem('AUTH_TOKEN') || '',
	);
}

// ─── Navigation ──────────────────────────────────────────────────────────

/**
 * Navigate to the dashboards list and wait for the page heading. The heading
 * is the only element guaranteed to render in both the empty zero-state and
 * the populated list view — search input and sort button are hidden in the
 * zero-state.
 */
export async function gotoDashboardsList(page: Page): Promise<void> {
	await page.goto(DASHBOARDS_LIST_PATH);
	await page
		.getByRole('heading', { name: LIST_HEADING, level: 1 })
		.waitFor({ state: 'visible' });
}

// ─── API helpers ─────────────────────────────────────────────────────────

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
	return json.data.id;
}

/** Seed a minimally-named dashboard via API. Returns the new ID. */
export async function createDashboardViaApi(
	page: Page,
	title: string,
): Promise<string> {
	return postDashboard(page, { title, uploadedGrafana: false });
}

/**
 * Seed the APM Metrics dashboard by driving the real "Import JSON" UI flow:
 * opens the New-dashboard dropdown, picks Import JSON, uploads the fixture
 * file, and clicks Import and Next. Returns the new dashboard ID parsed
 * from the destination URL.
 *
 * Pre-condition: the workspace must already be non-empty so the
 * `new-dashboard-cta` testid is rendered. Seed a minimal base dashboard via
 * `createDashboardViaApi` first if you're calling this from `beforeAll`.
 */
export async function importApmMetricsDashboardViaUI(
	page: Page,
): Promise<string> {
	await gotoDashboardsList(page);
	await page.getByTestId('new-dashboard-cta').click();
	await page.getByTestId('import-json-menu-cta').click();

	const dialog = page.getByRole('dialog');
	await dialog.waitFor({ state: 'visible' });

	// Ant Upload's hidden <input type="file"> — `setInputFiles` drives the
	// file selection without opening the OS file picker. The component's
	// `beforeUpload` returns false, so the file is parsed client-side into
	// the Monaco editor rather than being POSTed by Ant.
	await dialog
		.locator('input[type="file"]')
		.setInputFiles(APM_METRICS_TESTDATA_PATH);

	await dialog.getByRole('button', { name: 'Import and Next' }).click();

	await page.waitForURL(/\/dashboard\/[0-9a-f-]+/);
	const match = page.url().match(/\/dashboard\/([0-9a-f-]+)/);
	if (!match) {
		throw new Error(`Expected dashboard ID in URL, got: ${page.url()}`);
	}
	return match[1];
}

/**
 * Best-effort delete via API. Errors are swallowed so suite-level cleanup
 * stays resilient when a UI flow already deleted the resource (404) or the
 * stack is mid-shutdown.
 */
export async function deleteDashboardViaApi(
	request: APIRequestContext,
	id: string,
	token: string,
): Promise<void> {
	await request
		.delete(`/api/v1/dashboards/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
		})
		.catch(() => undefined);
}

/** Look up a dashboard ID by exact title via the list API. */
export async function findDashboardIdByTitle(
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

// ─── List page UI helpers ────────────────────────────────────────────────

/**
 * Filter the list to a specific dashboard by name and open its row action
 * menu. Returns the tooltip locator that wraps View / Open in New Tab /
 * Copy Link / Export JSON / Delete dashboard.
 *
 * The action icon scrolls out of the viewport when the matching row lands
 * below the table's sticky header — `scrollIntoViewIfNeeded` keeps the
 * click reliable regardless of how many other dashboards exist.
 */
export async function openDashboardActionMenu(
	page: Page,
	dashboardName: string,
): Promise<Locator> {
	await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(dashboardName);
	const icon = page.getByTestId('dashboard-action-icon').first();
	await icon.scrollIntoViewIfNeeded();
	await icon.click();
	return page.getByRole('tooltip');
}
