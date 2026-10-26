/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import type {
	ContextLink,
	PanelPluginSpec,
	Threshold,
} from '../helpers/dashboard-spec';
import { SINGLE_PANEL_ID } from '../testdata/dashboards/panels';

import { getViaApi } from './dashboards';
import { driver } from './kit';
import { test as editorTest } from './panel-editor';

// The panel editor's per-kind config editors: thresholds, context links,
// per-column units and the List columns editor.

/**
 * Variant follows panel kind, not a user control: label → TimeSeries/Bar,
 * comparison → Number, table → Table. Each has its own add button and row
 * testid prefix.
 */
export type ThresholdVariant = 'label' | 'comparison' | 'table';

const THRESHOLD_ADD_TESTID: Record<ThresholdVariant, string> = {
	label: 'panel-editor-v2-add-threshold',
	comparison: 'panel-editor-v2-add-comparison-threshold',
	table: 'panel-editor-v2-add-table-threshold',
};

const THRESHOLD_ROW_PREFIX: Record<ThresholdVariant, string> = {
	label: 'threshold',
	comparison: 'comparison-threshold',
	table: 'table-threshold',
};

export type ThresholdOperator =
	| 'above'
	| 'above_or_equal'
	| 'below'
	| 'below_or_equal'
	| 'equal'
	| 'not_equal';

export type ThresholdFormat = 'background' | 'text';

export interface ThresholdRow {
	value(): Locator;
	/** Label variant only. */
	label(): Locator;
	edit(): Locator;
	save(): Locator;
	discard(): Locator;
	remove(): Locator;
	/** Operator and format are radio tiles keyed by the persisted value. */
	setOperator(operator: ThresholdOperator): Promise<void>;
	setFormat(format: ThresholdFormat): Promise<void>;
	/** Table variant only: the column keys come from the live result. */
	pickFirstColumn(): Promise<void>;
}

export interface Thresholds {
	addButton(variant: ThresholdVariant): Locator;
	/** The section header's quick-add, which also expands a collapsed section. */
	headerAdd(): Locator;
	row(variant: ThresholdVariant, index: number): ThresholdRow;
}

export interface ContextLinks {
	addButton(): Locator;
	headerAdd(): Locator;
	dialog(): Locator;
	label(): Locator;
	url(): Locator;
	save(): Locator;
	cancel(): Locator;
	addParam(): Locator;
	paramKey(index: number): Locator;
	paramValue(index: number): Locator;
	item(index: number): Locator;
	edit(index: number): Locator;
	remove(index: number): Locator;
	/**
	 * Closes the URL field's suggestion popover, which otherwise keeps the
	 * dialog reflowing so buttons never settle. Escape would dismiss the whole
	 * dialog.
	 */
	blurFields(): Promise<void>;
}

export interface ListColumns {
	editor(): Locator;
	chip(name: string): Locator;
	remove(name: string): Locator;
	addButton(): Locator;
	search(): Locator;
	/** The explicit "Add …" entry, so a typo can't be committed by blurring. */
	addCustom(): Locator;
	/** Opens the dropdown and types `term`. */
	open(term: string): Promise<void>;
	/**
	 * Clicks the first suggestion once the results for `term` have landed;
	 * returns its field name.
	 */
	pickFirstSuggestion(term: string): Promise<string>;
}

export interface TableCells {
	/** The last cell of the first row, where the aggregated value lands. */
	valueCell(): Locator;
	/** Inline background, set only while a background threshold matches. */
	background(cell: Locator): Promise<string>;
	/** Spans the text format recolours. */
	coloredText(cell: Locator): Locator;
}

export interface SavedPanel {
	plugin: PanelPluginSpec;
	links: ContextLink[];
}

export interface PanelConfig {
	thresholds: Thresholds;
	contextLinks: ContextLinks;
	listColumns: ListColumns;
	columnUnits: {
		any(): Locator;
		/** The first per-column unit select, with the column key it targets. */
		first(): Promise<{ testId: string; key: string }>;
	};
	/** The plugin spec and links as persisted, straight from the API. */
	saved(dashboardId: string, panelId?: string): Promise<SavedPanel>;
	savedThresholds(dashboardId: string, panelId?: string): Promise<Threshold[]>;
	numberValue(): Locator;
	/** Inline colour on the rendered Number value, set only while a threshold matches. */
	numberValueColor(): Promise<string>;
	table: TableCells;
	text(text: string): Locator;
}

const COLUMN_UNIT_PREFIX = 'panel-editor-v2-column-unit-';
const SUGGESTION_PREFIX = 'list-columns-suggestion-';

function thresholdRow(
	page: Page,
	variant: ThresholdVariant,
	index: number,
): ThresholdRow {
	const prefix = THRESHOLD_ROW_PREFIX[variant];
	const byTestId = (part: string): Locator =>
		page.getByTestId(`${prefix}-${part}-${index}`);
	return {
		value: () => byTestId('value'),
		label: () => byTestId('label'),
		edit: () => byTestId('edit'),
		save: () => byTestId('save'),
		discard: () => byTestId('discard'),
		remove: () => byTestId('remove'),
		async setOperator(operator) {
			await page.getByTestId(`${prefix}-operator-${index}-${operator}`).click();
		},
		async setFormat(format) {
			await page.getByTestId(`${prefix}-format-${index}-${format}`).click();
		},
		async pickFirstColumn() {
			await byTestId('column').click();
			await page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.locator('.ant-select-item-option')
				.first()
				.click();
		},
	};
}

function panelConfigDriver(page: Page): PanelConfig {
	const numberValue = (): Locator => page.getByTestId('number-panel-value');
	const contextLinkLabel = (): Locator => page.getByTestId('context-link-label');
	const columnUnits = (): Locator =>
		page.locator(`[data-testid^="${COLUMN_UNIT_PREFIX}"]`);

	const config: PanelConfig = {
		thresholds: {
			addButton: (variant) => page.getByTestId(THRESHOLD_ADD_TESTID[variant]),
			headerAdd: () => page.getByTestId('panel-editor-v2-add-threshold-header'),
			row: (variant, index) => thresholdRow(page, variant, index),
		},
		contextLinks: {
			addButton: () => page.getByTestId('panel-editor-v2-add-link'),
			headerAdd: () => page.getByTestId('panel-editor-v2-add-link-header'),
			dialog: () => page.getByTestId('context-link-dialog'),
			label: contextLinkLabel,
			url: () => page.getByTestId('context-link-url'),
			save: () => page.getByTestId('context-link-save'),
			cancel: () => page.getByTestId('context-link-cancel'),
			addParam: () => page.getByTestId('context-link-add-param'),
			paramKey: (index) => page.getByTestId(`context-link-param-key-${index}`),
			paramValue: (index) => page.getByTestId(`context-link-param-value-${index}`),
			item: (index) => page.getByTestId(`context-link-item-${index}`),
			edit: (index) => page.getByTestId(`context-link-edit-${index}`),
			remove: (index) => page.getByTestId(`context-link-remove-${index}`),
			async blurFields() {
				await contextLinkLabel().focus();
			},
		},
		listColumns: {
			editor: () => page.getByTestId('list-columns-editor'),
			chip: (name) => page.getByTestId(`list-column-chip-${name}`),
			remove: (name) => page.getByTestId(`list-column-remove-${name}`),
			addButton: () => page.getByTestId('list-columns-add'),
			search: () => page.getByTestId('list-columns-search'),
			addCustom: () => page.getByTestId('list-columns-add-custom'),
			async open(term) {
				await page.getByTestId('list-columns-add').click();
				await page.getByTestId('list-columns-search').fill(term);
			},
			async pickFirstSuggestion(term) {
				const first = page.locator(`[data-testid^="${SUGGESTION_PREFIX}"]`).first();
				const firstName = async (): Promise<string> =>
					((await first.getAttribute('data-testid')) ?? '').replace(
						SUGGESTION_PREFIX,
						'',
					);
				// Search is debounced, so the previous results stay up until this
				// term's land; and the list repaints as they do, so the row is
				// clicked by its own testid rather than by position.
				await expect(page.getByText('Loading…')).toHaveCount(0);
				await expect.poll(firstName).toContain(term);
				const name = await firstName();
				await page.getByTestId(`${SUGGESTION_PREFIX}${name}`).click();
				return name;
			},
		},
		columnUnits: {
			any: () => columnUnits().first(),
			async first() {
				const testId =
					(await columnUnits().first().getAttribute('data-testid')) ?? '';
				return { testId, key: testId.replace(COLUMN_UNIT_PREFIX, '') };
			},
		},
		async saved(dashboardId, panelId = SINGLE_PANEL_ID) {
			const { spec } = await getViaApi(page, dashboardId);
			const panel = spec.panels[panelId].spec;
			return { plugin: panel.plugin.spec, links: panel.links ?? [] };
		},
		async savedThresholds(dashboardId, panelId) {
			return (await config.saved(dashboardId, panelId)).plugin.thresholds ?? [];
		},
		numberValue,
		numberValueColor: () =>
			numberValue().evaluate((node) => (node as HTMLElement).style.color),
		table: {
			valueCell: () =>
				page
					.getByTestId('table-panel-renderer')
					.locator('tbody tr.ant-table-row')
					.first()
					.locator('td')
					.last(),
			background: (cell) =>
				cell.evaluate((node) => (node as HTMLElement).style.backgroundColor),
			coloredText: (cell) => cell.locator('span[style*="color"]'),
		},
		text: (text) => page.getByText(text),
	};

	return config;
}

const withPanelConfig = driver('config', ({ page }) => panelConfigDriver(page));

export const test = withPanelConfig(editorTest);

export * from './panel-editor';
