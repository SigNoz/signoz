import path from 'path';

import {
	expect,
	type APIRequestContext,
	type Locator,
	type Page,
} from '@playwright/test';

import apmMetricsTemplate from '../testdata/apm-metrics.json';
import chartDataTemplate from '../testdata/chart-data-dashboard.json';
import variablesTemplate from '../testdata/variables-dashboard.json';

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
 * Generic helper: POST a dashboard with the given title, then PUT the full
 * `data` payload (variables / widgets / layout / version) at
 * `/dashboards/<id>`. The two-step dance is required because POST silently
 * drops everything except `{title, uploadedGrafana, version}` — the SigNoz UI
 * itself uses the same pattern.
 */
async function loadDashboardFromTemplate(
	page: Page,
	title: string,
	template: Record<string, unknown>,
): Promise<string> {
	const id = await postDashboard(page, { title, uploadedGrafana: false });
	const token = await authToken(page);
	const putRes = await page.request.put(`/api/v1/dashboards/${id}`, {
		data: { ...template, title },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!putRes.ok()) {
		throw new Error(
			`PUT /dashboards/${id} ${putRes.status()}: ${await putRes.text()}`,
		);
	}
	return id;
}

/**
 * Seed a dashboard exercising every variable type (TEXTBOX × 2, CUSTOM × 3,
 * QUERY × 2, DYNAMIC × 1) via the JSON fixture under
 * `tests/e2e/testdata/variables-dashboard.json`. Used by Group 3
 * (detail-variables) and Group 9 (detail-configure "lists existing
 * variables") tests. URL state keys variables by `name`, not `id`, so the
 * assertions look up `tb_env` / `cu_env_all` / etc. directly.
 */
export async function createVariablesDashboardViaApi(
	page: Page,
	title: string,
): Promise<string> {
	return loadDashboardFromTemplate(
		page,
		title,
		variablesTemplate as Record<string, unknown>,
	);
}

/**
 * Seed APM Metrics directly via the API — much faster than driving the
 * Import-JSON UI flow. Use this for any test that just needs APM Metrics on
 * the canvas; reserve `importApmMetricsDashboardViaUI` for tests that
 * actually exercise the import flow itself.
 */
export async function createApmMetricsDashboardViaApi(
	page: Page,
): Promise<string> {
	return loadDashboardFromTemplate(
		page,
		APM_METRICS_TITLE,
		apmMetricsTemplate as Record<string, unknown>,
	);
}

/**
 * Seed a single-panel "E2E Metric RPS" dashboard that queries the
 * `signoz_e2e_metric` counter without any variable substitution. Pair with
 * `seedMetricsViaSeeder` to populate the metric, then assert chart-data
 * rendering. Title is fixed by the JSON fixture.
 */
export async function createChartDataDashboardViaApi(
	page: Page,
): Promise<string> {
	return loadDashboardFromTemplate(
		page,
		(chartDataTemplate as { title: string }).title,
		chartDataTemplate as Record<string, unknown>,
	);
}

// ─── Seeder API ───────────────────────────────────────────────────────────
//
// The pytest harness brings up an HTTP seeder container exposing
// POST/DELETE on /telemetry/{traces,logs,metrics}. Its URL is written to
// `tests/e2e/.env.local` as `SIGNOZ_E2E_SEEDER_URL` and read here from the
// process environment.

/** Minimal shape the seeder accepts for a single metric sample. */
export interface SeederMetric {
	metric_name: string;
	labels: Record<string, string>;
	timestamp: string;
	value: number;
	temporality?: 'Cumulative' | 'Delta' | 'Unspecified';
	type_?: 'Sum' | 'Gauge' | 'Histogram' | 'Summary';
	is_monotonic?: boolean;
	description?: string;
	unit?: string;
}

function seederUrl(): string {
	const url = process.env.SIGNOZ_E2E_SEEDER_URL;
	if (!url) {
		throw new Error(
			'SIGNOZ_E2E_SEEDER_URL not set — pytest test_setup must be running.',
		);
	}
	return url;
}

/**
 * POST a batch of metrics into the seeder. The seeder writes them directly
 * into ClickHouse, bypassing the OTLP collector. Use this for tests that need
 * panel queries to return non-empty results.
 */
export async function seedMetricsViaSeeder(
	page: Page,
	metrics: SeederMetric[],
): Promise<void> {
	const res = await page.request.post(`${seederUrl()}/telemetry/metrics`, {
		data: metrics,
		headers: { 'Content-Type': 'application/json' },
	});
	if (!res.ok()) {
		throw new Error(
			`seeder POST /telemetry/metrics ${res.status()}: ${await res.text()}`,
		);
	}
}

/**
 * Truncate the metrics tables in ClickHouse via the seeder. Use in
 * `afterAll` for tests that mutate global telemetry state — the bootstrap
 * stack is shared across specs, so leftover seeded rows could affect
 * neighbouring suites.
 */
export async function clearMetricsViaSeeder(page: Page): Promise<void> {
	await page.request.delete(`${seederUrl()}/telemetry/metrics`);
}

/**
 * Wait for every variable in the persisted dashboard JSON to have a
 * "resolved" state — `selectedValue` populated, or `allSelected: true` for
 * showALLOption variables. This is the seam tests should cross before
 * acting: if a variable has a default in the seed, it's resolved immediately;
 * if it has no default (QUERY / DYNAMIC depending on backend resolution), the
 * UI's variable-select widget queries the backend, then writes the resolved
 * value back into the dashboard's variables map. Tests that share a dashboard
 * via `mode: 'serial'` must call this between tests so they don't race
 * against an in-flight resolve.
 *
 * Variables listed in `skipNames` are exempt — typically those that depend on
 * seeded telemetry the bootstrap stack does not produce (Dynamic; cascading
 * Query against an unresolved parent). Pass them so the wait does not block
 * indefinitely on values that can never appear.
 */
export async function awaitVariablesResolved(
	page: Page,
	dashboardId: string,
	options?: { skipNames?: string[]; timeout?: number },
): Promise<void> {
	const skip = new Set(options?.skipNames ?? []);
	const timeout = options?.timeout ?? 15_000;
	const token = await authToken(page);

	const isResolved = (v: Record<string, unknown>): boolean => {
		if (skip.has(String(v.name))) {
			return true;
		}
		if (v.allSelected === true) {
			return true;
		}
		const sv = v.selectedValue;
		if (sv === undefined || sv === null) {
			return false;
		}
		if (Array.isArray(sv)) {
			return sv.length > 0;
		}
		return typeof sv === 'string' ? sv.length > 0 : sv !== null;
	};

	await expect
		.poll(
			async () => {
				const res = await page.request.get(`/api/v1/dashboards/${dashboardId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok()) {
					return false;
				}
				const body = (await res.json()) as {
					data?: { data?: { variables?: Record<string, Record<string, unknown>> } };
				};
				const vars = body?.data?.data?.variables ?? {};
				return Object.values(vars).every(isResolved);
			},
			{
				timeout,
				message:
					'awaitVariablesResolved: dashboard.variables[*].selectedValue did not stabilise — pass `skipNames` for variables that require seeded telemetry',
			},
		)
		.toBe(true);
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
