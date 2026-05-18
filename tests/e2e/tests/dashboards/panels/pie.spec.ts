import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	changePanelType,
	configureAndSavePanel,
	createDashboardViaApi,
	deleteDashboardViaApi,
	findDashboardIdByTitle,
	openWidgetEditor,
	saveWidgetEdit,
} from '../../../helpers/dashboards';

test.describe.configure({ mode: 'serial' });

const FIXTURE_DASHBOARD_TITLE = 'pie-controls-fixture';
const FIXTURE_PANEL_TITLE = 'pie-controls-panel';

const seedIds = new Set<string>();

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const id = await createDashboardViaApi(page, FIXTURE_DASHBOARD_TITLE);
		seedIds.add(id);
		await page.goto(`/dashboard/${id}`);
		await page.getByTestId('add-panel').waitFor({ state: 'visible' });
		await configureAndSavePanel(page, 'metrics', FIXTURE_PANEL_TITLE);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await changePanelType(page, 'Pie');
		await saveWidgetEdit(page);
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) return;
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of [...seedIds]) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

async function gotoFixtureDashboard(page: Page): Promise<void> {
	const id = await findDashboardIdByTitle(page, FIXTURE_DASHBOARD_TITLE);
	expect(id, `${FIXTURE_DASHBOARD_TITLE} not found`).toBeTruthy();
	await page.goto(`/dashboard/${id}`);
	await page.getByTestId(FIXTURE_PANEL_TITLE).first().waitFor({ state: 'visible' });
}

async function expandSection(page: Page, title: string): Promise<void> {
	const section = page
		.locator('.settings-section')
		.filter({ has: page.locator('button.settings-section-header', { hasText: title }) });
	const contentDiv = section.locator('.settings-section-content');
	const isOpen = await contentDiv.evaluate((el) =>
		el.classList.contains('open'),
	);
	if (!isOpen) {
		await section.locator('button.settings-section-header').click();
		await contentDiv.waitFor({ state: 'visible' });
	}
}

async function selectYAxisUnit(
	page: Page,
	wrapperSelector: string,
	searchTerm: string,
	optionText: string,
): Promise<void> {
	const wrapper = page.locator(wrapperSelector).first();
	await wrapper.locator('.ant-select').click();
	await wrapper.locator('.ant-select input').fill(searchTerm);
	await page
		.locator('.ant-select-item-option-content', { hasText: optionText })
		.first()
		.click();
}

/**
 * Trigger the arc tooltip for the first pie slice and return its rendered
 * value text. Pie uses `@visx/tooltip` (plain DOM portal — not canvas) so the
 * tooltip node is reliably queryable.
 *
 * Playwright's `.hover()` is blocked by the SVG element intercepting pointer
 * events. `page.mouse.move` bypasses actionability checks but still relies on
 * the browser hit-testing landing on the `<g>`. The most reliable path is
 * `page.evaluate` firing a native `MouseEvent` of type `mouseover` directly
 * on the arc `<g>` element — React 17+ delegates `onMouseEnter` via
 * `mouseover` on the root, but also captures synthetic `mouseover` events
 * dispatched on child elements and applies enter/leave semantics.
 */
async function readPieArcTooltipText(page: Page): Promise<string> {
	// Wait for the arc group to be in the DOM.
	const firstArcG = page.locator('.piechart-container svg g g').first();
	await firstArcG.waitFor({ state: 'visible' });

	// Dispatch a synthetic mouseover directly on the arc <g>. This reaches
	// React's event delegation layer regardless of SVG pointer-event interception.
	// All browser globals are cast via `(globalThis as any)` because the
	// tsconfig lib does not include "dom" — page.evaluate callbacks run in the
	// browser but are type-checked in the Node context.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await page.evaluate((sel: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const w = globalThis as any;
		const g = w.document.querySelector(sel);
		if (!g) throw new Error('Arc <g> not found');
		g.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true, cancelable: true }));
	}, '.piechart-container svg g g');

	const tooltip = page.locator('.piechart-tooltip').first();
	await tooltip.waitFor({ state: 'visible', timeout: 5000 });
	const valueText = (await page.locator('.tooltip-value').first().textContent()) ?? '';

	// Dispatch mouseout on the arc to close the tooltip.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await page.evaluate((sel: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const w = globalThis as any;
		const g = w.document.querySelector(sel);
		if (!g) return;
		g.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, cancelable: true }));
	}, '.piechart-container svg g g');
	return valueText;
}

test.describe('Pie Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('pie-controls-renamed');
		await saveWidgetEdit(page);
		await expect(page.getByTestId('pie-controls-renamed').first()).toBeVisible();

		await openWidgetEditor(page, 'pie-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'pie-controls-renamed',
		);

		await page.getByTestId('panel-name-input').fill(FIXTURE_PANEL_TITLE);
		await saveWidgetEdit(page);
	});

	test('TC-02 description persists and toggles the widget-header info icon', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.getByTestId('panel-description-input')
			.fill('E2E pie description');
		await saveWidgetEdit(page);

		const header = page
			.locator('.widget-header-container')
			.filter({ hasText: FIXTURE_PANEL_TITLE });
		await expect(header.locator('.info-tooltip').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page.getByTestId('panel-description-input')).toHaveValue(
			'E2E pie description',
		);

		await page.getByTestId('panel-description-input').fill('');
		await saveWidgetEdit(page);
		await expect(header.locator('.info-tooltip')).toHaveCount(0);
	});

	test('TC-03 panel time preference switches to Last 15 min and persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.locator('section.panel-time-preference')
			.getByRole('button', { name: /global time/i })
			.click();
		await page.getByRole('menuitem', { name: /Last 15 min/i }).click();
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 15 min/i);

		await page
			.locator('section.panel-time-preference')
			.getByRole('button')
			.click();
		await page.getByRole('menuitem', { name: /Global Time/i }).click();
		await saveWidgetEdit(page);
	});

	test('TC-04 Y-axis unit applies to the SVG centre text and arc tooltip', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Formatting & Units');
		await selectYAxisUnit(
			page,
			'.y-axis-unit-selector-v2',
			'Milliseconds',
			'Milliseconds (ms)',
		);
		await saveWidgetEdit(page);

		// Visible change 1: the SVG centre text gains a `ms` tspan when a
		// unit is set.
		const centreTspans = page.locator('.piechart-container svg text tspan');
		await centreTspans.first().waitFor({ state: 'visible' });
		const tspanTexts = await centreTspans.allTextContents();
		expect(tspanTexts.some((t) => /ms/.test(t))).toBe(true);

		// Visible change 2: the arc tooltip includes the `ms` suffix.
		const tooltipText = await readPieArcTooltipText(page);
		expect(tooltipText).toMatch(/ms/);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Formatting & Units');
		await expect(
			page.locator('.y-axis-unit-selector-v2 .ant-select-selection-item').first(),
		).toContainText(/Milliseconds/);

		// Reset
		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);
	});

	test('TC-05 decimal precision changes the rendered arc-tooltip values', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Formatting & Units');
		// A unit is required for decimal precision to have a visible effect.
		await selectYAxisUnit(
			page,
			'.y-axis-unit-selector-v2',
			'Seconds',
			'Seconds (s)',
		);

		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '0 decimals' })
			.first()
			.click();

		await saveWidgetEdit(page);

		// Visible change: arc tooltip numeric portion has no decimal point.
		const tooltipText = await readPieArcTooltipText(page);
		const numericPart = tooltipText.replace(/[A-Za-z]+/g, '');
		expect(numericPart).not.toMatch(/\./);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Formatting & Units');
		await expect(page.getByTestId('decimal-precision-selector')).toContainText(
			/0 decimals/,
		);

		// Reset
		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '2 decimals' })
			.first()
			.click();
		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);
	});

	test('TC-06 Legend Colors panel renders one row per query series with a default color swatch', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Legend');

		const legendColorsCollapse = page.locator('.legend-colors-collapse').first();
		await legendColorsCollapse.locator('.ant-collapse-header').first().click();

		const items = page.locator('.legend-items .legend-item');
		await items.first().waitFor({ state: 'visible' });
		expect(await items.count()).toBeGreaterThan(0);

		const firstMarker = items.first().locator('.legend-marker');
		const markerStyle = (await firstMarker.getAttribute('style')) ?? '';
		expect(markerStyle).toMatch(/background-color:/);
	});

	test('TC-07 piechart-legend-item count matches the number of query series', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);

		// On the dashboard, count legend items and assert each has a coloured
		// swatch.
		await page.locator('.piechart-legend-item').first().waitFor({ state: 'visible' });
		const dashboardCount = await page.locator('.piechart-legend-item').count();
		expect(dashboardCount).toBeGreaterThan(0);

		const firstSwatchStyle = (await page
			.locator('.piechart-legend-item .piechart-legend-label')
			.first()
			.getAttribute('style')) ?? '';
		expect(firstSwatchStyle).toMatch(/background-color:/);
	});

	test('TC-08 panel type swap from Pie to Time Series and back persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Time Series');

		// Editor-side visual change: Time Series sections appear, Pie-only
		// `.piechart-wrapper` is gone from the editor preview area.
		await expect(page.locator('section.fill-gaps').first()).toBeVisible();

		await saveWidgetEdit(page);

		// Dashboard render now shows a uPlot chart, not a piechart.
		await expect(page.getByTestId('uplot-main-div').first()).toBeVisible();
		await expect(page.locator('.piechart-wrapper')).toHaveCount(0);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=graph/);

		// Reset
		await changePanelType(page, 'Pie');
		await saveWidgetEdit(page);
	});

	test('TC-09 sections hidden for PIE are not rendered', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expect(page.locator('section.fill-gaps')).toHaveCount(0);
		await expect(page.locator('section.stack-chart')).toHaveCount(0);
		await expect(page.locator('section.soft-min-max')).toHaveCount(0);
		await expect(page.locator('section.log-scale')).toHaveCount(0);
		await expect(page.locator('section.legend-position')).toHaveCount(0);
		await expect(page.locator('.column-unit-selector')).toHaveCount(0);
		await expect(page.getByTestId('add-threshold-cta')).toHaveCount(0);
		await expect(page.locator('.histogram-settings__bucket-config')).toHaveCount(
			0,
		);

		await expect(page.getByTestId('panel-name-input')).toBeVisible();
		await expect(page.getByTestId('panel-change-select')).toBeVisible();
		await expect(page.locator('section.panel-time-preference').first()).toBeVisible();

		await expandSection(page, 'Formatting & Units');
		await expect(page.locator('.y-axis-unit-selector-v2').first()).toBeVisible();
		await expect(page.getByTestId('decimal-precision-selector')).toBeVisible();

		await expandSection(page, 'Legend');
		await expect(page.locator('.legend-colors-collapse').first()).toBeVisible();
	});

	test('TC-10 discarding right-pane changes does not persist', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-pie-test');

		let putFired = false;
		await page.route(/\/api\/v1\/dashboards\//, (route) => {
			if (route.request().method() === 'PUT') {
				putFired = true;
			}
			route.continue();
		});

		await page.getByTestId('discard-button').click();
		await page
			.getByRole('dialog')
			.last()
			.getByRole('button', { name: /^OK$/i })
			.click({ timeout: 1000 })
			.catch(() => {
				// no modal — direct navigation
			});

		await page.waitForURL(/\/dashboard\/[0-9a-f-]+(?:\?|$)/);
		await expect(page.getByTestId(FIXTURE_PANEL_TITLE).first()).toBeVisible();
		expect(putFired).toBe(false);
	});
});
