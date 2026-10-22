/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import type { PanelKind } from '../../helpers/dashboard-v2-spec';
import { PATH } from '../dashboards';

const NEW_PANEL_DRAWER = 'panel-type-drawer';

/**
 * Every kind the type browser offers. Wider than `PanelKind`, which only names
 * the kinds the spec builders can seed.
 */
export type PickerKind =
	| PanelKind
	| 'signoz/AreaChartPanel'
	| 'signoz/HeatmapPanel'
	| 'signoz/TextPanel';

/** The type browser's catalog, in render order. */
export const PANEL_TYPE_TILES: {
	kind: PickerKind;
	label: string;
	category: string;
}[] = [
	{
		kind: 'signoz/TimeSeriesPanel',
		label: 'Time Series',
		category: 'Trends over time',
	},
	{
		kind: 'signoz/AreaChartPanel',
		label: 'Area Chart',
		category: 'Trends over time',
	},
	{
		kind: 'signoz/BarChartPanel',
		label: 'Bar Chart',
		category: 'Compare & rank',
	},
	{
		kind: 'signoz/PieChartPanel',
		label: 'Pie Chart',
		category: 'Compare & rank',
	},
	{
		kind: 'signoz/HistogramPanel',
		label: 'Histogram',
		category: 'Distributions',
	},
	{ kind: 'signoz/HeatmapPanel', label: 'Heatmap', category: 'Distributions' },
	{ kind: 'signoz/NumberPanel', label: 'Number', category: 'Single values' },
	{ kind: 'signoz/TablePanel', label: 'Table', category: 'Raw records' },
	{ kind: 'signoz/ListPanel', label: 'List', category: 'Raw records' },
	{ kind: 'signoz/TextPanel', label: 'Text', category: 'Documentation' },
];

/**
 * The New panel drawer every Add panel trigger opens. A tile click only selects
 * (TimeSeries is preselected); the confirm button navigates to the editor.
 */
export interface NewPanelPicker {
	root(): Locator;
	tile(kind: PickerKind): Locator;
	/** Visible tiles, in render order. */
	tiles(): Locator;
	/** Visible group headings, in render order. */
	groups(): Locator;
	search(): Locator;
	/** A category chip; its accessible name carries the count. */
	category(label: string): Locator;
	emptyState(): Locator;
	/** Reads "Add panel", or "Add to <section>" once there is a choice. */
	confirmButton(): Locator;
	/** Selects without confirming. */
	pick(kind: PickerKind): Promise<void>;
	confirm(): Promise<void>;
	/** Selects and confirms, landing on the editor route. */
	choose(kind: PickerKind): Promise<void>;
	/** `value` is the layoutIndex, or 'root' for a root yet to be created. */
	chooseSection(value: string): Promise<void>;
	/** Switches the target to a new section named `title`. */
	newSection(title: string): Promise<void>;
	cancel(): Promise<void>;
	/** An empty section's own New Panel CTA. Should move to drivers/dashboards.ts. */
	sectionAddPanel(): Locator;
}

export function newPanelDriver(page: Page): NewPanelPicker {
	const root = (): Locator => page.getByTestId(NEW_PANEL_DRAWER);
	const tiles = (): Locator =>
		root().locator('[data-testid^="panel-type-signoz/"]');

	const picker: NewPanelPicker = {
		root,
		tile: (kind) => root().getByTestId(`panel-type-${kind}`),
		tiles,
		groups: () => root().locator('section > span:first-child'),
		search: () => root().getByTestId('panel-type-search'),
		category: (label) =>
			root()
				.locator('button[aria-pressed]:not([data-testid])')
				.filter({ hasText: new RegExp(`^${escapeRegExp(label)}\\d+$`) }),
		emptyState: () => root().getByText(/No panel types match/),
		confirmButton: () => root().getByTestId('panel-type-confirm'),
		async pick(kind) {
			await picker.tile(kind).click();
			await expect(picker.tile(kind)).toHaveAttribute('aria-pressed', 'true');
		},
		async confirm() {
			await picker.confirmButton().click();
			await page.waitForURL(PATH.newPanel);
		},
		async choose(kind) {
			await picker.pick(kind);
			await picker.confirm();
		},
		async chooseSection(value) {
			await root().getByRole('button', { name: 'Choose section' }).click();
			await page.getByTestId(`panel-section-option-${value}`).click();
		},
		async newSection(title) {
			await root().getByRole('button', { name: 'Choose section' }).click();
			await page.getByTestId('panel-section-create').click();
			await root().getByTestId('panel-section-name').fill(title);
		},
		async cancel() {
			await root().getByRole('button', { name: 'Cancel', exact: true }).click();
			await expect(root()).toHaveCount(0);
		},
		sectionAddPanel: () =>
			page.locator('[data-testid^="section-add-panel-"]').first(),
	};
	return picker;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
