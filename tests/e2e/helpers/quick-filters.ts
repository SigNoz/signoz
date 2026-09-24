import { expect, type Locator, type Page } from '@playwright/test';

import { authToken } from './common';

export const LOGS_EXPLORER_PATH = '/logs/logs-explorer';

const SETTINGS_PANEL_TITLE = 'Edit quick filters';
const SETTINGS_ICON_TEST_ID = 'settings-icon';
const ANNOUNCEMENT_DISMISSED_KEY = 'QUICK_FILTERS_SETTINGS_ANNOUNCEMENT';
/**
 * Conservative lower bound for the open panel width. The panel is 342px in
 * QuickFiltersSettings.styles.scss; 300 leaves slack for sub-pixel rounding.
 */
const SETTINGS_PANEL_MIN_WIDTH_PX = 300;

// Pages that already had the announcement-dismissal init script registered.
// addInitScript re-runs on every navigation, so registering once per Page keeps
// the callback from stacking up across repeated helper calls.
const announcementDismissed = new WeakSet<Page>();

export type QuickFilterSignal = 'logs' | 'traces';

export interface QuickFilterDefinition {
	key: string;
	dataType: string;
	type: string;
}

export const DEFAULT_CUSTOM_FILTERS: QuickFilterDefinition[] = [
	{
		key: 'service.name',
		dataType: 'string',
		type: 'resource',
	},
	{
		key: 'deployment.environment',
		dataType: 'string',
		type: 'resource',
	},
];

function settingsPanel(page: Page): Locator {
	return page
		.locator('.quick-filters-settings')
		.filter({ hasText: SETTINGS_PANEL_TITLE });
}

function settingsGearContainer(page: Page): Locator {
	return page.getByTestId(SETTINGS_ICON_TEST_ID).locator('..');
}

/** Minimal filter set so `isDynamicFilters` is true and the settings gear renders. */
export async function seedCustomFiltersViaApi(
	page: Page,
	signal: QuickFilterSignal,
	filters: QuickFilterDefinition[] = DEFAULT_CUSTOM_FILTERS,
): Promise<void> {
	const token = await authToken(page);
	const res = await page.request.put('/api/v1/orgs/me/filters', {
		data: { signal, filters },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`PUT /api/v1/orgs/me/filters ${res.status()}: ${await res.text()}`,
		);
	}
}

/**
 * Hide the one-off announcement tooltip so it cannot intercept the gear click.
 * Registered via addInitScript (not page.evaluate) so it runs in the app's own
 * origin on every navigation — evaluate() before goto() would set localStorage
 * on the pre-navigation about:blank origin, which the app never reads. Must be
 * called before the first goto(). Guarded to once per Page to avoid stacking.
 */
export async function dismissQuickFiltersAnnouncement(
	page: Page,
): Promise<void> {
	if (announcementDismissed.has(page)) {
		return;
	}
	await page.addInitScript((key) => {
		// Runs in the browser; Node's tsc has no DOM globals on this callback.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as any).localStorage.setItem(key, 'false');
	}, ANNOUNCEMENT_DISMISSED_KEY);
	announcementDismissed.add(page);
}

export async function gotoExplorerWithQuickFilters(
	page: Page,
	path: string,
): Promise<void> {
	await dismissQuickFiltersAnnouncement(page);
	await page.goto(path);
	await page.getByTestId(SETTINGS_ICON_TEST_ID).waitFor({ state: 'visible' });
}

/** Settings drawer is closed — content unmounted and gear not active. */
export async function assertQuickFiltersSettingsDrawerClosed(
	page: Page,
): Promise<void> {
	await expect(page.getByText(SETTINGS_PANEL_TITLE)).toBeHidden();
	await expect(settingsGearContainer(page)).not.toHaveClass(/active/);
	// Collapsed panel keeps the `hidden` class (width: 0). Assert the class, not
	// toBeVisible() — a zero-width element is never "visible" to Playwright.
	await expect(page.locator('.quick-filters-settings')).toHaveClass(/hidden/);
}

/**
 * Click the settings gear. Pair with `assertQuickFiltersSettingsDrawerOpen` for
 * visibility/layout checks that guard overflow clipping regressions.
 */
export async function openQuickFiltersSettingsPanel(page: Page): Promise<void> {
	await assertQuickFiltersSettingsDrawerClosed(page);
	await page.getByTestId(SETTINGS_ICON_TEST_ID).click();
}

/**
 * Assert the customization drawer is open, painted on screen, and populated with
 * the seeded filters — not merely present in the DOM.
 */
export async function assertQuickFiltersSettingsDrawerOpen(
	page: Page,
	seededFilters: QuickFilterDefinition[] = DEFAULT_CUSTOM_FILTERS,
): Promise<void> {
	const panel = settingsPanel(page);
	const filtersColumn = page.locator('.quick-filters');

	await expect(settingsGearContainer(page)).toHaveClass(/active/);
	await expect(panel).toBeVisible();
	await expect(panel).not.toHaveClass(/hidden/);
	await expect(page.getByText(SETTINGS_PANEL_TITLE)).toBeVisible();
	await expect(page.getByPlaceholder('Search for a filter...')).toBeVisible();
	await expect(panel.locator('.qf-header-icon')).toBeVisible();

	const addedList = panel.locator('.qf-added-filters-list');
	await expect(panel.getByText('ADDED FILTERS')).toBeVisible();
	for (const filter of seededFilters) {
		await expect(addedList.getByText(filter.key, { exact: true })).toBeVisible();
	}

	// Footer only mounts after edits — absent on first open.
	await expect(panel.getByRole('button', { name: 'Discard' })).toBeHidden();
	await expect(panel.getByRole('button', { name: 'Save changes' })).toBeHidden();

	// OTHER FILTERS loads asynchronously from attribute/aggregate suggestions.
	await expect(panel.locator('.qf-other-filters-skeleton')).toHaveCount(0);
	await expect(panel.getByText('OTHER FILTERS')).toBeVisible();
	await expect(
		panel.locator('.qf-other-filters-list .other-filters-item').first(),
	).toBeVisible();

	const [panelBox, columnBox] = await Promise.all([
		panel.boundingBox(),
		filtersColumn.boundingBox(),
	]);
	expect(panelBox?.width ?? 0).toBeGreaterThanOrEqual(
		SETTINGS_PANEL_MIN_WIDTH_PX,
	);
	expect(columnBox).not.toBeNull();
	expect(panelBox!.x).toBeGreaterThanOrEqual(columnBox!.x);
}

/** Close via the drawer header X and confirm state resets. */
export async function closeQuickFiltersSettingsPanel(
	page: Page,
): Promise<void> {
	await settingsPanel(page).locator('.qf-header-icon').click();
	await assertQuickFiltersSettingsDrawerClosed(page);
}
