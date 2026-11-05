import { expect, type Locator, type Page } from '@playwright/test';

import { apiDriver } from './api';
import { driver, kit, type Layer } from './kit';
import {
	dismissQuickFiltersAnnouncement,
	LOGS_EXPLORER_PATH,
	logsExplorerDriver,
	type LogsExplorer,
} from './logs/explorer';

/**
 * The logs explorer, the quick-filters rail and the CodeMirror query editor —
 * one driver each, composed into the explorer `test`.
 */

export { LOGS_EXPLORER_PATH };

// ─── Quick filters ───────────────────────────────────────────────────────────

const SETTINGS_PANEL_TITLE = 'Edit quick filters';
const SETTINGS_ICON = 'settings-icon';
const SETTINGS_ICON_CONTAINER = 'settings-icon-container';
/** The panel is 342px wide; 300 leaves slack for sub-pixel rounding. */
const SETTINGS_PANEL_MIN_WIDTH_PX = 300;

export type QuickFilterSignal = 'logs' | 'traces';

export interface QuickFilterDefinition {
	key: string;
	dataType: string;
	type: string;
}

/** Minimal set so `isDynamicFilters` is true and the settings gear renders. */
export const DEFAULT_CUSTOM_FILTERS: QuickFilterDefinition[] = [
	{ key: 'service.name', dataType: 'string', type: 'resource' },
	{ key: 'deployment.environment', dataType: 'string', type: 'resource' },
];

export interface QuickFilters {
	seed(
		signal: QuickFilterSignal,
		filters?: QuickFilterDefinition[],
	): Promise<void>;
	/** Hide the one-off announcement tooltip so it cannot swallow the gear click. */
	dismissAnnouncement(): Promise<void>;
	gotoExplorer(path: string): Promise<void>;
	openSettings(): Promise<void>;
	closeSettings(): Promise<void>;
	expectSettingsOpen(seeded?: QuickFilterDefinition[]): Promise<void>;
	expectSettingsClosed(): Promise<void>;
	rail(): Locator;
	/** The settings drawer, open or not. */
	settingsPanel(): Locator;
}

export function quickFiltersDriver(page: Page): QuickFilters {
	const panel = (): Locator =>
		page
			.locator('.quick-filters-settings')
			.filter({ hasText: SETTINGS_PANEL_TITLE });
	const gearContainer = (): Locator => page.getByTestId(SETTINGS_ICON_CONTAINER);

	const filters: QuickFilters = {
		rail: () => page.locator('.quick-filters'),
		settingsPanel: panel,

		seed: async (signal, definitions = DEFAULT_CUSTOM_FILTERS) => {
			await apiDriver(page).put('/api/v1/orgs/me/filters', {
				signal,
				filters: definitions,
			});
		},

		dismissAnnouncement: () => dismissQuickFiltersAnnouncement(page),

		gotoExplorer: async (path) => {
			await filters.dismissAnnouncement();
			await page.goto(path);
			await page.getByTestId(SETTINGS_ICON).waitFor({ state: 'visible' });
		},

		expectSettingsClosed: async () => {
			await expect(page.getByText(SETTINGS_PANEL_TITLE)).toBeHidden();
			await expect(gearContainer()).toHaveAttribute('aria-expanded', 'false');
			// A collapsed panel keeps the `hidden` class (width: 0), and a zero-width
			// element is never "visible" to Playwright, so assert the class.
			await expect(page.locator('.quick-filters-settings')).toHaveClass(/hidden/);
		},

		openSettings: async () => {
			await filters.expectSettingsClosed();
			await page.getByTestId(SETTINGS_ICON).click();
		},

		closeSettings: async () => {
			await panel().getByTestId('quick-filters-settings-close').click();
			await filters.expectSettingsClosed();
		},

		/** Open, painted on screen and populated — not merely present in the DOM. */
		expectSettingsOpen: async (seeded = DEFAULT_CUSTOM_FILTERS) => {
			const settings = panel();
			await expect(gearContainer()).toHaveAttribute('aria-expanded', 'true');
			await expect(settings).toBeVisible();
			await expect(settings).not.toHaveClass(/hidden/);
			await expect(page.getByText(SETTINGS_PANEL_TITLE)).toBeVisible();
			await expect(page.getByPlaceholder('Search for a filter...')).toBeVisible();
			await expect(
				settings.getByTestId('quick-filters-settings-close'),
			).toBeVisible();

			const added = settings.locator('.qf-added-filters-list');
			await expect(settings.getByText('ADDED FILTERS')).toBeVisible();
			for (const filter of seeded) {
				// eslint-disable-next-line no-await-in-loop
				await expect(added.getByText(filter.key, { exact: true })).toBeVisible();
			}

			// The footer only mounts after an edit, so it is absent on first open.
			await expect(settings.getByRole('button', { name: 'Discard' })).toBeHidden();
			await expect(
				settings.getByRole('button', { name: 'Save changes' }),
			).toBeHidden();

			// OTHER FILTERS loads asynchronously from attribute suggestions.
			await expect(settings.locator('.qf-other-filters-skeleton')).toHaveCount(0);
			await expect(settings.getByText('OTHER FILTERS')).toBeVisible();
			await expect(
				settings.locator('.qf-other-filters-list .other-filters-item').first(),
			).toBeVisible();

			const [panelBox, columnBox] = await Promise.all([
				settings.boundingBox(),
				filters.rail().boundingBox(),
			]);
			expect(panelBox?.width ?? 0).toBeGreaterThanOrEqual(
				SETTINGS_PANEL_MIN_WIDTH_PX,
			);
			expect(columnBox).not.toBeNull();
			expect(panelBox?.x ?? 0).toBeGreaterThanOrEqual(columnBox?.x ?? 0);
		},
	};

	return filters;
}

// ─── Query editor ────────────────────────────────────────────────────────────

const EDITOR_CONTENT = '.query-where-clause-editor .cm-content';
const EDITOR_LINES = '.query-where-clause-editor .cm-line';

export interface QueryEditor {
	type(expression: string): Promise<void>;
	/** The first token whose text is exactly `text`; read its colour with `toHaveCSS`. */
	token(text: string): Locator;
	/** Set the app theme. Must run before the first navigation. */
	setTheme(theme: 'dark' | 'light'): Promise<void>;
}

export function queryEditorDriver(page: Page): QueryEditor {
	return {
		type: async (expression) => {
			const editor = page.locator(EDITOR_CONTENT).first();
			await editor.waitFor({ state: 'visible', timeout: 15_000 });
			// The caret can jump once after mount and rotate typed text, so retype
			// until the editor holds exactly the expression.
			await expect(async () => {
				await editor.click();
				await page.keyboard.press('ControlOrMeta+a');
				await page.keyboard.press('Delete');
				await page.keyboard.type(expression);
				await expect(editor).toHaveText(expression, { timeout: 1_000 });
			}).toPass({ timeout: 15_000 });
		},

		token: (text) =>
			page.locator(EDITOR_LINES).getByText(text, { exact: true }).first(),

		setTheme: async (theme) => {
			await page.addInitScript((value) => {
				localStorage.setItem('THEME', value);
			}, theme);
		},
	};
}

export const withExplorers: Layer<{
	logs: LogsExplorer;
	quickFilters: QuickFilters;
	editor: QueryEditor;
}> = (base) =>
	driver('editor', ({ page }) => queryEditorDriver(page))(
		driver('quickFilters', ({ page }) => quickFiltersDriver(page))(
			driver('logs', ({ page }) => logsExplorerDriver(page))(base),
		),
	);

/** The explorers `test`. */
export const test = withExplorers(kit);
export { expect } from './kit';
