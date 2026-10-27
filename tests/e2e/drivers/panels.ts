/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { PanelKind } from '../helpers/dashboard-spec';
import { logDetailsDrawer } from '../helpers/logs-explorer';

import { test as dashboardsTest } from './dashboards';
import { driver } from './kit';
import { actionsAt, PanelAction, type PanelActions } from './panels/actions';
import { type Chart, chartAt } from './panels/chart';
import { openSelectOption } from './panels/dom';
import { gridAt, type PanelGrid } from './panels/grid';
import { type HeatmapTooltip, heatmapTooltipAt } from './panels/heatmap';
import { type Legend, legendAt } from './panels/legend';
import { type Markdown, markdownAt } from './panels/markdown';
import { type PiePanel, pieAt } from './panels/pie';
import { type TableRows, tableAt } from './panels/table';

// Rendered panels, on the dashboard grid and in the View modal. Each surface
// lives in its own part under ./panels, and so does a kind with UI of its own.

export const PanelMessageText = {
	// Curly apostrophe (U+2019): a straight quote will not match.
	errorTitle: 'Couldn’t load panel data',
	noDataTitle: 'No data in this time range',
	extendAction: 'Extend time range',
	retryAction: 'Retry',
} as const;

/** Root testid each kind's renderer puts on its own subtree. */
export const RENDERER_TESTID: Record<PanelKind, string> = {
	[PanelKind.TimeSeries]: 'time-series-renderer',
	[PanelKind.BarChart]: 'bar-panel-renderer',
	[PanelKind.AreaChart]: 'area-chart-renderer',
	[PanelKind.Histogram]: 'histogram-panel-renderer',
	[PanelKind.Number]: 'number-panel-renderer',
	[PanelKind.PieChart]: 'pie-panel-renderer',
	[PanelKind.Table]: 'table-panel-renderer',
	[PanelKind.List]: 'list-panel-renderer',
	[PanelKind.Heatmap]: 'heatmap-panel-renderer',
	[PanelKind.Text]: 'text-panel',
};

export interface PanelHandle {
	root(): Locator;
	/** Panels fetch lazily behind an IntersectionObserver. */
	scrollIntoView(): Promise<void>;
	/** Scrolls in, then waits for the kind's own renderer. */
	waitRendered(kind: PanelKind): Promise<void>;
	renderer(kind: PanelKind): Locator;
	/** `data-panel-visible`, 'true' once the panel entered the viewport. */
	visibility(): Locator;
	title(): Locator;
	infoIcon(): Locator;
	timePreference(): Locator;
	statusWarning(): Locator;
	statusError(): Locator;
	loading(): Locator;
	noData(): Locator;
	noDataAction(): Locator;
	noDataSecondaryAction(): Locator;
	error(): Locator;
	errorAction(): Locator;
	text(text: string): Locator;
	numberValue(): Locator;
	markdown: Markdown;
	pie: PiePanel;
	chart: Chart;
	legend: Legend;
	actions: PanelActions;
	table: TableRows;
	grid: PanelGrid;
}

export interface Panels {
	panel(id: string): PanelHandle;
	/** Every panel title on the grid. */
	titles(): Locator;
	tooltip: {
		container(): Locator;
		/** Hover tooltips render their content twice, so this scopes to the tooltip role. */
		statusContent(): Locator;
		/** Free text inside any open tooltip. */
		text(text: string): Locator;
		heatmap: HeatmapTooltip;
	};
	/** The log detail drawer a List row of logs opens. */
	logDetail(): Locator;
	drilldown: {
		menu(): Locator;
		/** Testids sit on an inner span; this walks up so disabled states assert. */
		item(testId: string): Locator;
		back(menu: 'breakout' | 'var'): Locator;
		breakoutSearch(): Locator;
		/** The panel's saved context links, by label. */
		contextLinks(): Locator;
		/** A page-level Escape does nothing: the handler needs the backdrop. */
		dismiss(): Promise<void>;
	};
	view: {
		/** Opens the modal through the actions menu. */
		open(panelId: string): Promise<Locator>;
		content(): Locator;
		dialog(): Locator;
		refresh(): Locator;
		switchToEdit(): Locator;
		chart: Chart;
		renderer(kind: PanelKind): Locator;
		markdown: Markdown;
		/** Changes the kind for this session only. */
		switchType(label: string): Promise<void>;
	};
	/** Fires the browser's Back. */
	back(): Promise<void>;
	/** Resolves with the tab a click opens. */
	nextTab(): Promise<Page>;
	/** Resolves with the suggested filename of the next download. */
	nextDownload(): Promise<{ suggestedFilename: () => string }>;
}

function panelHandle(page: Page, id: string): PanelHandle {
	const root = (): Locator => page.locator(`[data-panel-root="${id}"]`);
	const byTestId = (testId: string): Locator => root().getByTestId(testId);

	return {
		root,
		async scrollIntoView() {
			await root().scrollIntoViewIfNeeded();
		},
		async waitRendered(kind) {
			await root().scrollIntoViewIfNeeded();
			await expect(root()).toHaveAttribute('data-panel-visible', 'true');
			await expect(byTestId(RENDERER_TESTID[kind])).toBeVisible();
		},
		renderer: (kind) => byTestId(RENDERER_TESTID[kind]),
		visibility: root,
		title: () => byTestId('panel-title'),
		infoIcon: () => byTestId('panel-header-info-icon'),
		timePreference: () => byTestId('panel-time-preference'),
		statusWarning: () => byTestId('panel-status-warning'),
		statusError: () => byTestId('panel-status-error'),
		loading: () => byTestId('panel-loading'),
		noData: () => byTestId('panel-no-data'),
		noDataAction: () => byTestId('panel-no-data-action'),
		noDataSecondaryAction: () => byTestId('panel-no-data-secondary-action'),
		error: () => byTestId('panel-error'),
		errorAction: () => byTestId('panel-error-action'),
		text: (text) => root().getByText(text),
		numberValue: () => byTestId('number-panel-value'),
		markdown: markdownAt(() => byTestId(RENDERER_TESTID[PanelKind.Text])),
		pie: pieAt(page, () => byTestId(RENDERER_TESTID[PanelKind.PieChart])),
		chart: chartAt(page, () => byTestId('uplot-main-div')),
		legend: legendAt(root),
		actions: actionsAt(page, id, root),
		table: tableAt(root),
		grid: gridAt(page, root),
	};
}

function panelsDriver(page: Page): Panels {
	const menu = (): Locator => page.locator('.context-menu');
	const viewContent = (): Locator =>
		page.getByTestId('view-panel-modal-content');

	return {
		panel: (id) => panelHandle(page, id),
		titles: () => page.getByTestId('panel-title'),
		tooltip: {
			container: () => page.getByTestId('uplot-tooltip-container'),
			statusContent: () =>
				page.getByRole('tooltip').getByTestId('panel-status-content'),
			text: (text) => page.getByText(text),
			heatmap: heatmapTooltipAt(page),
		},
		logDetail: () => logDetailsDrawer(page),
		drilldown: {
			menu,
			item: (testId) =>
				page
					.getByTestId(testId)
					.locator(
						'xpath=ancestor-or-self::button[contains(@class,"context-menu-item")][1]',
					),
			back: (submenu) => page.getByTestId(`drilldown-${submenu}-back`),
			breakoutSearch: () => page.getByPlaceholder('Search breakout options...'),
			contextLinks: () => page.getByTestId('drilldown-context-link'),
			async dismiss() {
				// A corner, since the menu opens over the clicked point.
				await page
					.locator('.context-menu-backdrop')
					.click({ position: { x: 5, y: 5 } });
			},
		},
		view: {
			async open(panelId) {
				await panelHandle(page, panelId).actions.run(PanelAction.view);
				await expect(viewContent()).toBeVisible();
				return viewContent();
			},
			content: viewContent,
			dialog: () => page.getByRole('dialog'),
			refresh: () => page.getByTestId('view-panel-refresh'),
			switchToEdit: () => page.getByTestId('view-panel-switch-to-edit'),
			chart: chartAt(page, () => viewContent().getByTestId('uplot-main-div')),
			renderer: (kind) => viewContent().getByTestId(RENDERER_TESTID[kind]),
			markdown: markdownAt(() =>
				viewContent().getByTestId(RENDERER_TESTID[PanelKind.Text]),
			),
			async switchType(label) {
				await page.getByTestId('view-panel-type-selector').click();
				await openSelectOption(page, label).click();
			},
		},
		async back() {
			await page.goBack();
		},
		nextTab: () => page.context().waitForEvent('page'),
		nextDownload: () => page.waitForEvent('download'),
	};
}

const withPanels = driver('panels', ({ page }) => panelsDriver(page));

export const test = withPanels(dashboardsTest);

export * from './dashboards';
export * from './panels/actions';
export * from './panels/chart';
export * from './panels/dom';
export * from './panels/grid';
export * from './panels/heatmap';
export * from './panels/legend';
export * from './panels/markdown';
export * from './panels/pie';
export * from './panels/table';
