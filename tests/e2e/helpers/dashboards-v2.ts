import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { authToken } from './dashboards';

// Helpers for the V2 dashboard detail page (`DashboardPageV2`), which now serves
// /dashboard/:id unconditionally. The V1 helpers in ./dashboards.ts still cover
// seeding through the v1 API and the list page.
//
// Interaction contracts encoded here rather than in each spec:
//   - a multi-select variable commits on dropdown CLOSE, not per toggle;
//   - an ALL selection renders as an overlay reading "ALL", not as tags;
//   - a variable is only settled once its options have arrived.

export const dashboardV2Path = (id: string): string => `/dashboard/${id}`;

/** Perses-style spec the v2 API stores. Only what the specs need is typed. */
export interface DashboardV2Spec {
	display: { name: string; description?: string };
	layouts: unknown[];
	panels: Record<string, unknown>;
	variables: unknown[];
	[key: string]: unknown;
}

export const SCHEMA_VERSION = 'v6';

/** An empty but valid spec — the base every fixture spreads over. */
export function emptyV2Spec(name: string): DashboardV2Spec {
	return { display: { name }, layouts: [], panels: {}, variables: [] };
}

// ─── Seeding through the v2 API ───────────────────────────────────────────
//
// Specs seed the shape they assert against, rather than relying on whatever the
// v1 -> v2 migration happens to produce or on telemetry that ambient data may or
// may not contain. Migration output is covered on its own, from the v1 fixtures.

export async function createDashboardV2ViaApi(
	page: Page,
	name: string,
	spec?: Partial<DashboardV2Spec>,
): Promise<string> {
	const token = await authToken(page);
	const res = await page.request.post('/api/v2/dashboards', {
		data: {
			name,
			schemaVersion: SCHEMA_VERSION,
			tags: [],
			// `name` wins over any display name the fixture carries, so a fixture can be
			// seeded twice under two titles and each spec can still find its own.
			spec: {
				...emptyV2Spec(name),
				...spec,
				display: { ...spec?.display, name },
			},
		},
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`POST /api/v2/dashboards ${res.status()}: ${await res.text()}`,
		);
	}
	const body = (await res.json()) as { data?: { id?: string } };
	const id = body.data?.id;
	if (!id) {
		throw new Error(
			`POST /api/v2/dashboards returned no id: ${JSON.stringify(body)}`,
		);
	}
	return id;
}

export async function getDashboardV2(
	page: Page,
	id: string,
): Promise<{ spec: DashboardV2Spec; [key: string]: unknown }> {
	const token = await authToken(page);
	const res = await page.request.get(`/api/v2/dashboards/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`GET /api/v2/dashboards/${id} ${res.status()}: ${await res.text()}`,
		);
	}
	const body = (await res.json()) as {
		data: { spec: DashboardV2Spec; [key: string]: unknown };
	};
	return body.data;
}

export async function deleteDashboardV2ViaApi(
	request: APIRequestContext,
	id: string,
	token: string,
): Promise<void> {
	await request.delete(`/api/v2/dashboards/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
}

// ─── Variables bar ────────────────────────────────────────────────────────

export const variablesBar = (page: Page): Locator =>
	page.getByTestId('dashboard-variables-bar');

/** The pill for one variable: its name, the control, and (while loading) a spinner. */
export const variablePill = (page: Page, name: string): Locator =>
	page.getByTestId(`variable-${name}`);

/** List variables (query / custom / dynamic) — the select control. */
export const variableControl = (page: Page, name: string): Locator =>
	page.getByTestId(`variable-select-${name}`);

/** Text variables — a plain input, not a select. */
export const variableTextInput = (page: Page, name: string): Locator =>
	page.getByTestId(`variable-input-${name}`);

/**
 * The bar collapses variables that do not fit into a "+N" button. At the config's
 * 1280px viewport that starts with the second variable, so a spec asserting on
 * several pills at once must widen the viewport:
 *
 *   test.use({ viewport: WIDE_VIEWPORT });
 */
export const WIDE_VIEWPORT = { width: 1920, height: 1080 };

export const hiddenVariablesTooltip = (page: Page): Locator =>
	page.getByTestId('hidden-variables-tooltip');

/** Resolved when the variable's options have arrived and its spinner is gone. */
export async function awaitVariableSettled(
	page: Page,
	name: string,
): Promise<void> {
	await expect(variablePill(page, name)).toBeVisible();
	await expect(page.getByTestId(`variable-loading-${name}`)).toBeHidden();
}

/**
 * What a list variable's closed control shows — "ALL" for an ALL selection, else its
 * tags. Asserts the control exists first: a missing one (wrong name, or a text
 * variable, which uses {@link variableTextInput}) otherwise hangs until the test
 * times out with nothing to point at.
 */
export async function readVariableSelection(
	page: Page,
	name: string,
): Promise<string> {
	const pill = variablePill(page, name);
	await expect(pill).toBeVisible();
	// The ALL overlay sits in the control's wrapper, as a SIBLING of the element
	// carrying the testid — scope from the pill, or an ALL selection reads as empty.
	const allOverlay = pill.locator('.all-text');
	if ((await allOverlay.count()) > 0 && (await allOverlay.isVisible())) {
		return (await allOverlay.textContent())?.trim() ?? '';
	}
	return (await variableControl(page, name).innerText()).trim();
}

export async function openVariableDropdown(
	page: Page,
	name: string,
): Promise<void> {
	await awaitVariableSettled(page, name);
	await variableControl(page, name).click();
	await expect(page.locator('.custom-multiselect-dropdown')).toBeVisible();
}

/**
 * Close the open dropdown, which is what commits a multi-select edit. Pressing
 * Escape leaves the control focused without re-opening it, unlike clicking away.
 */
export async function closeVariableDropdown(page: Page): Promise<void> {
	await page.keyboard.press('Escape');
	await expect(page.locator('.custom-multiselect-dropdown')).toBeHidden();
}

const escapeForRegExp = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One option row in the open dropdown, matched on its label element rather than the
 * row's accessible name: hovering reveals the Only / Toggle buttons, whose text joins
 * that name, so a name-based locator stops matching halfway through an interaction.
 */
export function optionRow(page: Page, value: string): Locator {
	return page.locator('.custom-multiselect-dropdown .option-item').filter({
		has: page.locator('.option-label-text', {
			hasText: new RegExp(`^${escapeForRegExp(value)}$`),
		}),
	});
}

/**
 * Select exactly `values` in a multi-select variable and commit them. Returns once the
 * dropdown is shut — i.e. after the single commit that closing triggers.
 */
export async function pickVariableValues(
	page: Page,
	name: string,
	values: string[],
): Promise<void> {
	await openVariableDropdown(page, name);
	const [first, ...rest] = values;

	// Start from the row's "Only" button rather than its checkbox: an ALL selection
	// opens with every option checked, so a click would UNcheck the wanted value and
	// leave the rest selected. "Only" collapses to exactly this option either way,
	// and the clear icon is deliberately unavailable while the draft is all.
	const firstRow = optionRow(page, first);
	await firstRow.hover();
	await firstRow.locator('.only-btn').click();

	// Additional values then add to that selection.
	for (const value of rest) {
		await optionRow(page, value).click();
	}
	await closeVariableDropdown(page);
}

/** Type a value the option list does not offer, and commit it. */
export async function typeVariableValue(
	page: Page,
	name: string,
	value: string,
): Promise<void> {
	await openVariableDropdown(page, name);
	await page.keyboard.type(value);
	const dropdown = page.locator('.custom-multiselect-dropdown');
	await dropdown.getByText(value, { exact: true }).first().click();
	await closeVariableDropdown(page);
}

// ─── Panels and sections ──────────────────────────────────────────────────

export const panelByTitle = (page: Page, title: string): Locator =>
	page.locator('[data-panel-id]').filter({ hasText: title });

export const sectionByName = (page: Page, name: string): Locator =>
	page.locator('[data-section-id]').filter({ hasText: name });

/** Resolved when no panel on the page is still fetching. */
export async function awaitPanelsSettled(page: Page): Promise<void> {
	await expect(page.getByTestId('panel-refetching')).toHaveCount(0);
}
