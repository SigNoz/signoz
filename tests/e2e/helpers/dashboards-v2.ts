import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { authToken } from './common';
import type { PanelKind, PostableDashboardV2 } from './dashboard-v2-spec';

// Seeding + navigation for V2 dashboards.
//
// Separate from `helpers/dashboards.ts`, whose `/api/v1/dashboards` calls now
// return NewV1DeprecatedError. V2's POST takes the full spec in one call.

// ─── Routes ──────────────────────────────────────────────────────────────

export const DASHBOARDS_API = '/api/v2/dashboards';

export function dashboardPath(dashboardId: string): string {
	return `/dashboard/${dashboardId}`;
}

/** Editor route — `ROUTES.DASHBOARD_PANEL_EDITOR`. `panelId` is 'new' for creation. */
export function panelEditorPath(dashboardId: string, panelId: string): string {
	return `/dashboard/${dashboardId}/panel/${panelId}`;
}

// ─── API ─────────────────────────────────────────────────────────────────

export interface GettableDashboardV2 {
	id: string;
	name: string;
	locked: boolean;
	tags: { key: string; value: string }[];
	spec: PostableDashboardV2['spec'];
}

async function bearer(page: Page): Promise<{ Authorization: string }> {
	return { Authorization: `Bearer ${await authToken(page)}` };
}

/**
 * A 400 here is almost always the strict decoder rejecting a stray key; the
 * body names the field, so it's surfaced verbatim.
 */
export async function createDashboardV2ViaApi(
	page: Page,
	dashboard: PostableDashboardV2,
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
	const body = (await res.json()) as { data: GettableDashboardV2 };
	return body.data.id;
}

/** Read the persisted spec — use to assert what a UI edit actually saved. */
export async function getDashboardV2ViaApi(
	page: Page,
	dashboardId: string,
): Promise<GettableDashboardV2> {
	const res = await page.request.get(`${DASHBOARDS_API}/${dashboardId}`, {
		headers: await bearer(page),
	});
	if (!res.ok()) {
		throw new Error(
			`GET ${DASHBOARDS_API}/${dashboardId} ${res.status()}: ${await res.text()}`,
		);
	}
	const body = (await res.json()) as { data: GettableDashboardV2 };
	return body.data;
}

/** Best-effort: a UI flow may already have deleted it. */
export async function deleteDashboardV2ViaApi(
	request: APIRequestContext,
	dashboardId: string,
	token: string,
): Promise<void> {
	await request
		.delete(`${DASHBOARDS_API}/${dashboardId}`, {
			headers: { Authorization: `Bearer ${token}` },
		})
		.catch(() => undefined);
}

/** Same path, no body: PUT locks, DELETE unlocks. */
export async function setDashboardLockedViaApi(
	page: Page,
	dashboardId: string,
	locked: boolean,
): Promise<void> {
	const url = `${DASHBOARDS_API}/${dashboardId}/lock`;
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

// ─── Navigation ──────────────────────────────────────────────────────────

/** Waits for `data-panel-root` — the first marker that the grid, not just the shell, rendered. */
export async function gotoDashboardV2(
	page: Page,
	dashboardId: string,
): Promise<void> {
	await page.goto(dashboardPath(dashboardId));
	await page.locator('[data-panel-root]').first().waitFor({ state: 'attached' });
}

/** Open a dashboard expected to have no panels (asserts the empty state instead). */
export async function gotoEmptyDashboardV2(
	page: Page,
	dashboardId: string,
): Promise<void> {
	await page.goto(dashboardPath(dashboardId));
	await expect(page.getByTestId('add-panel')).toBeVisible();
}

/** Open the editor for an existing panel. */
export async function gotoPanelEditor(
	page: Page,
	dashboardId: string,
	panelId: string,
): Promise<void> {
	await page.goto(panelEditorPath(dashboardId, panelId));
	// Scoped: the ResizablePanelGroup shares this testid (derived from its id).
	await expect(
		page.locator('[data-testid="panel-editor-v2"]:not([data-group])'),
	).toBeVisible();
}

/** `panelKind` is required — without it the route redirects to the dashboard. */
export async function gotoNewPanelEditor(
	page: Page,
	dashboardId: string,
	panelKind: PanelKind,
	layoutIndex = 0,
): Promise<void> {
	const search = new URLSearchParams({
		panelKind,
		layoutIndex: String(layoutIndex),
	});
	await page.goto(`${panelEditorPath(dashboardId, 'new')}?${search.toString()}`);
	// Scoped: the ResizablePanelGroup shares this testid (derived from its id).
	await expect(
		page.locator('[data-testid="panel-editor-v2"]:not([data-group])'),
	).toBeVisible();
}
