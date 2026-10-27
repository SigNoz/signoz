/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

import type {
	ContextLink,
	PanelPluginSpec,
} from '../helpers/dashboard-spec.types';
import { SINGLE_PANEL_ID } from '../testdata/dashboards/panels';

import { getViaApi } from './dashboards';
import { driver } from './kit';
import { test as editorTest } from './panel-editor';

// The panel editor's config editors with UI of their own: thresholds and
// context links.

/** The label variant TimeSeries, Bar and Area use. */
export interface ThresholdRow {
	value(): Locator;
	label(): Locator;
	save(): Locator;
}

export interface Thresholds {
	addButton(): Locator;
	row(index: number): ThresholdRow;
}

export interface ContextLinks {
	addButton(): Locator;
	headerAdd(): Locator;
	dialog(): Locator;
	label(): Locator;
	url(): Locator;
	save(): Locator;
	item(index: number): Locator;
	/**
	 * Closes the URL field's suggestion popover, which otherwise keeps the
	 * dialog reflowing so buttons never settle. Escape would dismiss the whole
	 * dialog.
	 */
	blurFields(): Promise<void>;
}

export interface SavedPanel {
	plugin: PanelPluginSpec;
	links: ContextLink[];
}

export interface PanelConfig {
	thresholds: Thresholds;
	contextLinks: ContextLinks;
	/** The plugin spec and links as persisted, straight from the API. */
	saved(dashboardId: string, panelId?: string): Promise<SavedPanel>;
}

function panelConfigDriver(page: Page): PanelConfig {
	const contextLinkLabel = (): Locator => page.getByTestId('context-link-label');

	return {
		thresholds: {
			addButton: () => page.getByTestId('panel-editor-v2-add-threshold'),
			row: (index) => ({
				value: () => page.getByTestId(`threshold-value-${index}`),
				label: () => page.getByTestId(`threshold-label-${index}`),
				save: () => page.getByTestId(`threshold-save-${index}`),
			}),
		},
		contextLinks: {
			addButton: () => page.getByTestId('panel-editor-v2-add-link'),
			headerAdd: () => page.getByTestId('panel-editor-v2-add-link-header'),
			dialog: () => page.getByTestId('context-link-dialog'),
			label: contextLinkLabel,
			url: () => page.getByTestId('context-link-url'),
			save: () => page.getByTestId('context-link-save'),
			item: (index) => page.getByTestId(`context-link-item-${index}`),
			async blurFields() {
				await contextLinkLabel().focus();
			},
		},
		async saved(dashboardId, panelId = SINGLE_PANEL_ID) {
			const { spec } = await getViaApi(page, dashboardId);
			const panel = spec.panels[panelId].spec;
			return { plugin: panel.plugin.spec, links: panel.links ?? [] };
		},
	};
}

const withPanelConfig = driver('config', ({ page }) => panelConfigDriver(page));

export const test = withPanelConfig(editorTest);

export * from './panel-editor';
