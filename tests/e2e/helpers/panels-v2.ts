import { expect, type Locator, type Page } from '@playwright/test';

import { PanelKind } from './dashboard-v2-spec';

// Locators and interactions for rendered V2 panels (dashboard grid + View
// modal). Editor-side helpers live in `helpers/panel-editor-v2.ts`.

// ─── Labels ──────────────────────────────────────────────────────────────
//
// @signozhq/ui's dropdown preset doesn't forward `testId` to menu items, so the
// visible label IS the contract — matched via Radix's `role=menuitem`.

export const PanelAction = {
	view: 'View',
	edit: 'Edit panel',
	clone: 'Clone',
	download: 'Download',
	downloadCsv: 'Download as CSV',
	downloadPng: 'Download as PNG',
	downloadSvg: 'Download as SVG',
	createAlert: 'Create Alerts',
	move: 'Move to section',
	moveToRoot: 'Dashboard (root)',
	delete: 'Delete panel',
} as const;

export const PanelMessageText = {
	noQueryTitle: 'Nothing to visualize yet',
	// Curly apostrophe (U+2019) — a straight quote will not match.
	errorTitle: 'Couldn’t load panel data',
	noDataTitle: 'No data in this time range',
	extendAction: 'Extend time range',
	retryAction: 'Retry',
} as const;

/** Root `data-testid` each kind's renderer puts on its own subtree. */
export const RENDERER_TESTID: Record<PanelKind, string> = {
	[PanelKind.TimeSeries]: 'time-series-renderer',
	[PanelKind.BarChart]: 'bar-panel-renderer',
	[PanelKind.Histogram]: 'histogram-panel-renderer',
	[PanelKind.Number]: 'number-panel-renderer',
	[PanelKind.PieChart]: 'pie-panel-renderer',
	[PanelKind.Table]: 'table-panel-renderer',
	[PanelKind.List]: 'list-panel-renderer',
};

// ─── Locators ────────────────────────────────────────────────────────────

/** No testid on the panel root; `data-panel-root` is the stable handle. */
export function panelRoot(page: Page, panelId: string): Locator {
	return page.locator(`[data-panel-root="${panelId}"]`);
}

export function panelRenderer(
	page: Page,
	panelId: string,
	kind: PanelKind,
): Locator {
	return panelRoot(page, panelId).getByTestId(RENDERER_TESTID[kind]);
}

/** Scrolls into view first — panels fetch lazily behind an IntersectionObserver. */
export async function waitForPanelRendered(
	page: Page,
	panelId: string,
	kind: PanelKind,
): Promise<void> {
	const root = panelRoot(page, panelId);
	await root.scrollIntoViewIfNeeded();
	await expect(root).toHaveAttribute('data-panel-visible', 'true');
	await expect(root.getByTestId(RENDERER_TESTID[kind])).toBeVisible();
}

// ─── Actions menu ────────────────────────────────────────────────────────

/** The ⋮ trigger only appears on hover. */
export async function openPanelActions(
	page: Page,
	panelId: string,
): Promise<Locator> {
	// A previous menu caught mid-dismiss trips strict mode or eats the click.
	await closePanelActions(page);

	const root = panelRoot(page, panelId);
	await root.scrollIntoViewIfNeeded();
	await root.hover();
	await page.getByTestId(`panel-actions-${panelId}`).click();
	const menu = page.getByRole('menu');
	await expect(menu).toBeVisible();
	return menu;
}

/** Dismiss an open panel menu and wait until it is really gone. */
export async function closePanelActions(page: Page): Promise<void> {
	if ((await page.getByRole('menu').count()) === 0) {
		return;
	}
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toHaveCount(0);
}

/** Open the ⋮ menu and click one item by its visible label. */
export async function runPanelAction(
	page: Page,
	panelId: string,
	label: string,
): Promise<void> {
	await openPanelActions(page, panelId);
	await page.getByRole('menuitem', { name: label, exact: true }).click();
}

/** Hover opens the submenu; clicking the parent would close the dropdown. */
export async function downloadPanelAs(
	page: Page,
	panelId: string,
	format: 'CSV' | 'PNG' | 'SVG',
): Promise<void> {
	await openPanelActions(page, panelId);
	await page
		.getByRole('menuitem', { name: PanelAction.download, exact: true })
		.hover();
	await page
		.getByRole('menuitem', { name: `Download as ${format}`, exact: true })
		.click();
}

// ─── Geometry ────────────────────────────────────────────────────────────

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Throws instead of returning null (specs can't contain conditionals). */
export async function boundingBoxOf(
	locator: Locator,
	description: string,
): Promise<Box> {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	expect(box, `expected a bounding box for ${description}`).not.toBeNull();
	return box as Box;
}

/** The extra pre-mousedown move gives uPlot a cursor anchor to drag from. */
export async function dragHorizontally(
	page: Page,
	box: Box,
	fromFraction: number,
	toFraction: number,
): Promise<void> {
	const y = box.y + box.height / 2;
	const startX = box.x + box.width * fromFraction;
	const endX = box.x + box.width * toFraction;

	await page.mouse.move(startX, y);
	await page.mouse.move(startX, y);
	await page.mouse.down();
	await page.mouse.move(endX, y, { steps: 16 });
	await page.mouse.up();
}

/** The uPlot canvas host inside a panel. */
export function panelChart(page: Page, panelId: string): Locator {
	return panelRoot(page, panelId).getByTestId('uplot-main-div');
}

/**
 * uPlot binds its cursor handlers to `.u-over`, so this — not the container —
 * is the drag target. Container-relative fractions drift onto the axis gutter,
 * whose width is browser/DPR dependent.
 */
export function panelPlotArea(page: Page, panelId: string): Locator {
	return panelChart(page, panelId).locator('.u-over');
}

/** RGL appends the resize grip here, a SIBLING of `[data-panel-root]`. */
export function panelGridItem(page: Page, panelId: string): Locator {
	return panelRoot(page, panelId).locator(
		'xpath=ancestor::div[contains(@class,"react-grid-item")][1]',
	);
}

/** RGL's south-east resize grip for a panel. */
export function panelResizeHandle(page: Page, panelId: string): Locator {
	return panelGridItem(page, panelId).locator('.react-resizable-handle');
}

// ─── Drilldown ───────────────────────────────────────────────────────────

/** The drilldown popover, portalled to body and shared by every panel. */
export function contextMenu(page: Page): Locator {
	return page.locator('.context-menu');
}

/** Testids sit on an inner span; walk up so disabled-state assertions work. */
export function drilldownItem(page: Page, testId: string): Locator {
	return page
		.getByTestId(testId)
		.locator(
			'xpath=ancestor-or-self::button[contains(@class,"context-menu-item")][1]',
		);
}

// ─── States ──────────────────────────────────────────────────────────────

export function panelNoData(page: Page, panelId: string): Locator {
	return panelRoot(page, panelId).getByTestId('panel-no-data');
}

export function panelError(page: Page, panelId: string): Locator {
	return panelRoot(page, panelId).getByTestId('panel-error');
}

// ─── Header search (Table / List only) ───────────────────────────────────

export async function searchInPanel(
	page: Page,
	panelId: string,
	term: string,
): Promise<void> {
	const root = panelRoot(page, panelId);
	await root.hover();
	await root.getByTestId('panel-header-search-trigger').click();
	await root.getByTestId('panel-header-search-input').fill(term);
}

// ─── List pagination ─────────────────────────────────────────────────────

export const listPager = {
	root: (page: Page, panelId: string): Locator =>
		panelRoot(page, panelId).getByTestId('list-panel-pager'),
	prev: (page: Page, panelId: string): Locator =>
		panelRoot(page, panelId).getByTestId('list-panel-prev'),
	next: (page: Page, panelId: string): Locator =>
		panelRoot(page, panelId).getByTestId('list-panel-next'),
	page: (page: Page, panelId: string): Locator =>
		panelRoot(page, panelId).getByTestId('list-panel-page'),
	pageSize: (page: Page, panelId: string): Locator =>
		panelRoot(page, panelId).getByTestId('list-panel-page-size'),
};

// ─── View modal ──────────────────────────────────────────────────────────

export async function openViewModal(
	page: Page,
	panelId: string,
): Promise<Locator> {
	await runPanelAction(page, panelId, PanelAction.view);
	const content = page.getByTestId('view-panel-modal-content');
	await expect(content).toBeVisible();
	return content;
}
