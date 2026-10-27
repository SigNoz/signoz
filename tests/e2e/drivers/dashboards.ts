/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import {
	expect,
	type Locator,
	type Page,
	type Request,
} from '@playwright/test';

import { BASE_PATH } from '../helpers/base-path';
import { authToken } from '../helpers/common';
import type {
	GettableDashboard,
	PostableDashboard,
} from '../helpers/dashboard-spec.types';
import {
	holdQueryRange,
	isQueryRange,
	mockQueryRange,
	mockQueryRangeError,
	type QueryRangeBody,
	type QueryWindow,
	recordQueryWindows,
	unmockQueryRange,
} from '../helpers/query-range-mock';

import { driver, kit } from './kit';

// `POST /api/v2/dashboards` takes the full perses spec in one call.

export const DASHBOARDS_API = '/api/v2/dashboards';

export const PATH = {
	dashboard: (id: string): string => `/dashboard/${id}`,
	/** `panelId` is 'new' for creation. */
	editor: (id: string, panelId: string): string =>
		`/dashboard/${id}/panel/${panelId}`,
	/** Matches the dashboard route itself, with or without a query string. */
	onDashboard: (id: string): RegExp => new RegExp(`/dashboard/${id}(\\?|$)`),
	/** Matches the dashboard route once the View modal has written its params. */
	onDashboardWithParams: (id: string): RegExp =>
		new RegExp(`/dashboard/${id}\\?`),
	newPanel: /\/panel\/new\?/,
} as const;

/**
 * `panel-editor-v2` is not unique: the ResizablePanelGroup derives the same
 * testid from its `id`, which is also its localStorage layout key.
 */
export const EDITOR_ROOT = '[data-testid="panel-editor-v2"]:not([data-group])';

export interface Dashboards {
	/** Created for this test and deleted when it ends. */
	seed(dashboard: PostableDashboard): Promise<string>;
	seedAndOpen(dashboard: PostableDashboard): Promise<string>;
	seedAndEdit(dashboard: PostableDashboard, panelId: string): Promise<string>;
	/** The open dashboard's heading. */
	title(): Locator;
	/** Waits for the grid, not just the shell. */
	open(id: string): Promise<void>;
	/** For a dashboard with no panels: waits for the empty state instead. */
	openEmpty(id: string): Promise<void>;
	openEditor(id: string, panelId: string): Promise<void>;
	/** Navigates without waiting for anything, for routes expected to redirect. */
	visit(path: string): Promise<void>;
	/**
	 * A client-side route change, as a link would make: no reload, so only a
	 * router blocker could stop it. For screens with no link to the target.
	 */
	navigateInApp(path: string): Promise<void>;
	reload(): Promise<void>;
	get(id: string): Promise<GettableDashboard>;
	setLocked(id: string, locked: boolean): Promise<void>;
	/** A panel's grid geometry as persisted, not as rendered. */
	gridItem(id: string, panelId: string): Promise<GridGeometry>;
	/** A query param of the current URL, where the time window lives. */
	param(name: string): string | null;
	emptyAddPanel(): Locator;
	headerAddPanel(): Locator;
	zoomOut(): Locator;
	variable(name: string): Locator;
	confirmDelete(): Locator;
	/** Free text anywhere on the page, e.g. a confirm dialog's title. */
	text(text: string): Locator;
}

export interface GridGeometry {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface QueryRangeMock {
	/** Fulfils every call with one body. Install before navigating. */
	respond(body: QueryRangeBody): Promise<void>;
	fail(message?: string): Promise<void>;
	/** Holds every call until `release` is called, then serves `body`. */
	hold(body: QueryRangeBody): Promise<{ release: () => void }>;
	/** Drops interception so later calls reach the backend. */
	reset(): Promise<void>;
	/** Resolves with the next query_range request. */
	nextRequest(): Promise<Request>;
	/** The window of every query_range request from now on. */
	recordWindows(): QueryWindow[];
}

async function bearer(page: Page): Promise<{ Authorization: string }> {
	return { Authorization: `Bearer ${await authToken(page)}` };
}

/**
 * A 400 is almost always the strict decoder rejecting a stray key; the body
 * names the field, so it is surfaced verbatim.
 */
export async function createViaApi(
	page: Page,
	dashboard: PostableDashboard,
): Promise<string> {
	const res = await page.request.post(DASHBOARDS_API, {
		data: dashboard,
		headers: await bearer(page),
	});
	if (!res.ok()) {
		throw new Error(
			`POST ${DASHBOARDS_API} ${res.status()}: ${await res.text()}`,
		);
	}
	return ((await res.json()) as { data: GettableDashboard }).data.id;
}

export async function getViaApi(
	page: Page,
	id: string,
): Promise<GettableDashboard> {
	const res = await page.request.get(`${DASHBOARDS_API}/${id}`, {
		headers: await bearer(page),
	});
	if (!res.ok()) {
		throw new Error(
			`GET ${DASHBOARDS_API}/${id} ${res.status()}: ${await res.text()}`,
		);
	}
	return ((await res.json()) as { data: GettableDashboard }).data;
}

/** Same path, no body: PUT locks, DELETE unlocks. */
async function setLockedViaApi(
	page: Page,
	id: string,
	locked: boolean,
): Promise<void> {
	const url = `${DASHBOARDS_API}/${id}/lock`;
	const headers = await bearer(page);
	const res = locked
		? await page.request.put(url, { headers })
		: await page.request.delete(url, { headers });
	if (!res.ok()) {
		throw new Error(
			`${locked ? 'PUT' : 'DELETE'} ${url} ${res.status()}: ${await res.text()}`,
		);
	}
}

const trackedByPage = new WeakMap<Page, string[]>();

/** Registers a dashboard for deletion when the test owning `page` ends. */
export function trackDashboard(page: Page, id: string): void {
	trackedByPage.set(page, [...(trackedByPage.get(page) ?? []), id]);
}

/**
 * Best effort: a dashboard the test already deleted 404s, and an unlocked one
 * rejects the unlock. A locked dashboard rejects the DELETE, so unlock first.
 */
export async function deleteViaApi(page: Page, id: string): Promise<void> {
	const headers = await bearer(page);
	await page.request
		.delete(`${DASHBOARDS_API}/${id}/lock`, { headers })
		.catch(() => undefined);
	await page.request
		.delete(`${DASHBOARDS_API}/${id}`, { headers })
		.catch(() => undefined);
}

/**
 * Not asserted: a test that deleted its own dashboard, or left a closed page
 * behind, must not fail on cleanup.
 */
export async function removeTrackedDashboards(page: Page): Promise<void> {
	const ids = trackedByPage.get(page) ?? [];
	trackedByPage.delete(page);
	try {
		for (const id of ids) {
			await deleteViaApi(page, id);
		}
	} catch {
		/* the dashboards outlive the run rather than hiding why it failed */
	}
}

function dashboardsDriver(page: Page): Dashboards {
	const editorRoot = (): Locator => page.locator(EDITOR_ROOT);

	const dashboards: Dashboards = {
		async seed(dashboard) {
			const id = await createViaApi(page, dashboard);
			trackDashboard(page, id);
			return id;
		},
		title: () => page.getByTestId('dashboard-title'),
		async seedAndOpen(dashboard) {
			const id = await dashboards.seed(dashboard);
			await dashboards.open(id);
			return id;
		},
		async seedAndEdit(dashboard, panelId) {
			const id = await dashboards.seed(dashboard);
			await dashboards.openEditor(id, panelId);
			return id;
		},
		async open(id) {
			await page.goto(PATH.dashboard(id));
			await page
				.locator('[data-panel-root]')
				.first()
				.waitFor({ state: 'attached' });
		},
		async openEmpty(id) {
			await page.goto(PATH.dashboard(id));
			await expect(dashboards.emptyAddPanel()).toBeVisible();
		},
		async openEditor(id, panelId) {
			await page.goto(PATH.editor(id, panelId));
			await expect(editorRoot()).toBeVisible();
		},
		async visit(path) {
			await page.goto(path);
		},
		async navigateInApp(path) {
			await page.evaluate((target) => {
				window.history.pushState({}, '', target);
				window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
			}, `${BASE_PATH}${path}`);
		},
		async reload() {
			await page.reload();
		},
		get: (id) => getViaApi(page, id),
		setLocked: (id, locked) => setLockedViaApi(page, id, locked),
		async gridItem(id, panelId) {
			const { spec } = await getViaApi(page, id);
			for (const layout of spec.layouts) {
				const item = layout.spec.items.find(
					(candidate) => candidate.content.$ref === `#/spec/panels/${panelId}`,
				);
				if (item) {
					return { x: item.x, y: item.y, width: item.width, height: item.height };
				}
			}
			throw new Error(`no grid item for panel ${panelId}`);
		},
		param: (name) => new URL(page.url()).searchParams.get(name),
		emptyAddPanel: () => page.getByTestId('add-panel'),
		headerAddPanel: () => page.getByTestId('add-panel-header'),
		zoomOut: () => page.getByTestId('zoom-out-btn'),
		variable: (name) => page.getByTestId(`variable-${name}`),
		confirmDelete: () => page.getByTestId('confirm-delete'),
		text: (text) => page.getByText(text),
	};

	return dashboards;
}

function queryRangeDriver(page: Page): QueryRangeMock {
	return {
		respond: (body) => mockQueryRange(page, body),
		fail: (message) => mockQueryRangeError(page, message),
		hold: (body) => holdQueryRange(page, body),
		reset: () => unmockQueryRange(page),
		nextRequest: () => page.waitForRequest((r) => isQueryRange(r.url())),
		recordWindows: () => recordQueryWindows(page),
	};
}

const withDashboards = driver(
	'dashboards',
	({ page }) => dashboardsDriver(page),
	(_, { page }) => removeTrackedDashboards(page),
);

const withQueryRange = driver('queryRange', ({ page }) =>
	queryRangeDriver(page),
);

export const test = withQueryRange(withDashboards(kit));

export { expect } from './kit';
export * from '../helpers/dashboard-spec';
export type * from '../helpers/dashboard-spec.types';
export { heatmapPoints, QueryRange, ramp } from '../helpers/query-range-mock';
export * from '../testdata/dashboards/panels';
