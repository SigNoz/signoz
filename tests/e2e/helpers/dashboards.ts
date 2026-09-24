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
import queriesData from '../testdata/queries.json';

export type SignalType = 'metrics' | 'logs' | 'traces';
export type QueriesData = typeof queriesData;

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

/** Shape of the persisted dashboard payload returned by GET /api/v1/dashboards/<id>. */
export interface DashboardData {
	title: string;
	description?: string;
	tags?: string[];
	widgets?: Array<{ id?: string; title?: string }>;
	variables?: Record<string, Record<string, unknown>>;
	layout?: unknown[];
}

/**
 * Fetch the persisted dashboard payload via API. Use this for "did the save
 * actually land on the server?" assertions — UI-only checks can pass on
 * optimistic-update bugs.
 */
export async function fetchDashboardData(
	page: Page,
	id: string,
): Promise<DashboardData> {
	const token = await authToken(page);
	const res = await page.request.get(`/api/v1/dashboards/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`GET /dashboards/${id} ${res.status()}: ${await res.text()}`);
	}
	const body = (await res.json()) as { data: { data: DashboardData } };
	return body.data.data;
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

// ─── Dashboard detail page helpers ──────────────────────────────────────────

/**
 * Click the Configure button (`data-testid="show-drawer"`) on a dashboard
 * detail page and wait for the settings drawer (`.settings-container-root`) to
 * be visible. Works from both the empty-state view and the populated toolbar —
 * both render the same testid.
 *
 * Returns the drawer locator so callers can scope further assertions to it.
 */
export async function openDashboardSettingsDrawer(
	page: Page,
): Promise<Locator> {
	await page.getByTestId('show-drawer').first().click();
	const drawer = page.locator('.settings-container-root');
	await drawer.waitFor({ state: 'visible' });
	return drawer;
}

/**
 * Click `data-testid="save-dashboard-config"` and wait for the resulting
 * `PUT /api/v1/dashboards/<id>` response. The Save button is only rendered
 * when there is at least one unsaved change — callers must ensure the drawer
 * has been dirtied before calling this.
 */
export async function saveDashboardSettings(page: Page): Promise<void> {
	const patchResponse = page.waitForResponse(
		(r) =>
			r.request().method() === 'PUT' && /\/api\/v1\/dashboards\//.test(r.url()),
	);
	await page.getByTestId('save-dashboard-config').click();
	await patchResponse;
}

/**
 * Rename a dashboard via the toolbar options popover:
 * opens the popover (`data-testid="options"`), clicks "Rename", fills the
 * input, clicks "Rename Dashboard", and waits for the PUT response.
 *
 * Pre-condition: the caller must be on the dashboard detail page.
 */
export async function renameDashboardViaToolbar(
	page: Page,
	newTitle: string,
): Promise<void> {
	await page.getByTestId('options').click();
	await page.getByRole('button', { name: 'Rename' }).click();

	const modal = page.getByRole('dialog');
	await modal.waitFor({ state: 'visible' });

	const input = modal.getByTestId('dashboard-name');
	await input.clear();
	await input.fill(newTitle);

	const patchResponse = page.waitForResponse(
		(r) =>
			r.request().method() === 'PUT' && /\/api\/v1\/dashboards\//.test(r.url()),
	);
	await page.getByRole('button', { name: 'Rename Dashboard' }).click();
	await patchResponse;

	await modal.waitFor({ state: 'hidden' });
}

// ─── Add panel flow ─────────────────────────────────────────────────────────

/**
 * From the dashboard detail page (must already be loaded), drive the full
 * "Add Panel" flow for the given signal type:
 *   1. Click the empty-state `add-panel` CTA to open the New Panel modal.
 *   2. Pick the Time Series panel type.
 *   3. Fill the panel name in the right pane (drives the post-save assertion).
 *   4. For metrics: type the metric name from `queries.json` into the metric
 *      AutoComplete and select it from the dropdown. For logs/traces: switch
 *      the data-source selector to LOGS / TRACES; default Query Builder state
 *      is sufficient (queries.json query strings are empty by design).
 *   5. Click Save Changes and wait for the PUT /api/v1/dashboards/<id> response.
 *
 * Throws if the PUT response is not 2xx. After return, the page is back on
 * the dashboard detail page; the caller asserts the panel rendered.
 */
export async function configureAndSavePanel(
	page: Page,
	signal: SignalType,
	panelTitle: string,
): Promise<void> {
	await page.getByTestId('add-panel').click();

	const newPanelModal = page
		.getByRole('dialog')
		.filter({ hasText: 'New Panel' });
	await newPanelModal.waitFor({ state: 'visible' });
	await newPanelModal.getByTestId('panel-type-graph').click();

	await page.getByTestId('new-widget-save').waitFor({ state: 'visible' });
	await page.getByTestId('panel-name-input').fill(panelTitle);

	if (signal === 'metrics') {
		const metricName = queriesData.metrics.metricName;
		// The testid is on the Ant Select wrapper <div>; the editable input
		// lives inside it. Target the descendant input for fill().
		const metricInput = page
			.getByTestId('metric-name-selector-0')
			.locator('input');
		await metricInput.click();
		await metricInput.fill(metricName);
		// AutoComplete debounces and fetches; wait for the option then click.
		await page
			.locator('.ant-select-item-option-content', { hasText: metricName })
			.first()
			.click();
	} else {
		// logs / traces — switch the data source. Default query is sufficient.
		await page.getByTestId('query-data-source-selector-0').click();
		await page
			.locator('.ant-select-item-option-content', {
				hasText: signal.toUpperCase(),
			})
			.click();
	}

	const putResponse = page.waitForResponse(
		(r) =>
			r.request().method() === 'PUT' && /\/api\/v1\/dashboards\//.test(r.url()),
	);
	await page.getByTestId('new-widget-save').click();

	const res = await putResponse;
	if (!res.ok()) {
		throw new Error(
			`PUT /api/v1/dashboards failed ${res.status()}: ${await res.text()}`,
		);
	}

	// Save navigates back to /dashboard/<id> (no /new suffix).
	await page.waitForURL(/\/dashboard\/[0-9a-f-]+(?:\?|$)/);
}
