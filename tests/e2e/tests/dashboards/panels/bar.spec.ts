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

const FIXTURE_DASHBOARD_TITLE = 'bar-controls-fixture';
const FIXTURE_PANEL_TITLE = 'bar-controls-panel';

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
		await changePanelType(page, 'Bar');
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

test.describe('Bar Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('bar-controls-renamed');
		await saveWidgetEdit(page);
		await expect(page.getByTestId('bar-controls-renamed').first()).toBeVisible();

		await openWidgetEditor(page, 'bar-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'bar-controls-renamed',
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
			.fill('E2E bar description');
		await saveWidgetEdit(page);

		const header = page
			.locator('.widget-header-container')
			.filter({ hasText: FIXTURE_PANEL_TITLE });
		await expect(header.locator('.info-tooltip').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page.getByTestId('panel-description-input')).toHaveValue(
			'E2E bar description',
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

	test('TC-04 stack series toggle persists; editor reflects state via data-stacking-state', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		const stackSwitch = page.locator('section.stack-chart').getByRole('switch');
		const panelChangeSelect = page.getByTestId('panel-change-select');

		await expect(stackSwitch).toHaveAttribute('aria-checked', 'false');
		await expect(panelChangeSelect).toHaveAttribute('data-stacking-state', 'false');

		await stackSwitch.click();
		await expect(stackSwitch).toHaveAttribute('aria-checked', 'true');
		await expect(panelChangeSelect).toHaveAttribute('data-stacking-state', 'true');

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.stack-chart').getByRole('switch'),
		).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByTestId('panel-change-select')).toHaveAttribute(
			'data-stacking-state',
			'true',
		);

		// Reset
		await page.locator('section.stack-chart').getByRole('switch').click();
		await saveWidgetEdit(page);
	});

	test('TC-05 Y-axis unit persists', async ({ authedPage: page }) => {
		// Tooltip-based visible-change check is omitted — the test stack's
		// `signoz_calls_total` data slides outside the dashboard's default
		// "Last 30 minutes" window mid-suite, so the rendered panel often
		// shows "No Data" and the tooltip never appears. Verify persistence
		// only — the selector value round-trips through PUT.
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

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Formatting & Units');
		await expect(
			page.locator('.y-axis-unit-selector-v2 .ant-select-selection-item').first(),
		).toContainText(/Milliseconds/);

		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);
	});

	test('TC-06 decimal precision persists', async ({ authedPage: page }) => {
		// Tooltip-based visible-change check is omitted for the same reason
		// as TC-05.
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Formatting & Units');
		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '0 decimals' })
			.first()
			.click();

		await saveWidgetEdit(page);

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
		await saveWidgetEdit(page);
	});

	test('TC-07 soft min and soft max persist (canvas-only visual)', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Axes');

		await page.locator('section.soft-min-max .ant-input-number-input').first().fill('10');
		await page.locator('section.soft-min-max .ant-input-number-input').last().fill('100');
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Axes');
		await expect(
			page.locator('section.soft-min-max .ant-input-number-input').first(),
		).toHaveValue('10');
		await expect(
			page.locator('section.soft-min-max .ant-input-number-input').last(),
		).toHaveValue('100');

		await page.locator('section.soft-min-max .ant-input-number-input').first().fill('');
		await page.locator('section.soft-min-max .ant-input-number-input').last().fill('');
		await saveWidgetEdit(page);
	});

	test('TC-08 log scale persists (canvas-only visual)', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Axes');
		await page.locator('section.log-scale .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Logarithmic$/ })
			.first()
			.click();
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Axes');
		await expect(
			page.locator('section.log-scale .ant-select-selection-item').first(),
		).toContainText(/Logarithmic/);

		await page.locator('section.log-scale .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Linear$/ })
			.first()
			.click();
		await saveWidgetEdit(page);
	});

	test('TC-09 legend position swap toggles chart-layout--legend-right and shows the search input', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Legend');

		await expect(page.locator('.chart-layout--legend-right')).toHaveCount(0);
		await expect(page.getByTestId('legend-search-input')).toHaveCount(0);

		await page.locator('section.legend-position .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Right$/ })
			.first()
			.click();

		await expect(page.locator('.chart-layout--legend-right').first()).toBeVisible();
		await expect(page.getByTestId('legend-search-input').first()).toBeVisible();

		await saveWidgetEdit(page);

		await expect(page.locator('.chart-layout--legend-right').first()).toBeVisible();
		await expect(page.getByTestId('legend-search-input').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Legend');
		await page.locator('section.legend-position .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Bottom$/ })
			.first()
			.click();
		await saveWidgetEdit(page);

		await expect(page.locator('.chart-layout--legend-right')).toHaveCount(0);
		await expect(page.getByTestId('legend-search-input')).toHaveCount(0);
	});

	test('TC-10 Legend Colors panel renders one row per query series with a default color swatch', async ({
		authedPage: page,
	}) => {
		// Driving the Ant ColorPicker is fiddly across builds (trigger class
		// varies, preset chips may not be configured). Per-option testids have
		// been added in `YAxisUnitSelector.tsx` for the unit picker, but the
		// LegendColors picker uses Ant's `ColorPicker` directly with no stable
		// testids. The pragmatic check is structural: when a query has run
		// and produced series, the Legend Colors collapse panel renders one
		// row per legend label with a `.legend-marker` carrying an inline
		// `background-color` (the auto-assigned default). This guards against
		// regressions in the LegendColors → query-response wiring.
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

	test('TC-11 threshold add + persistence (canvas-only line)', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();
		const card = page.locator('.threshold-container').first();

		// Bar thresholds do NOT have a label input — the time-series-alerts block
		// only renders for TIME_SERIES. Skip label.
		await card.getByTestId('threshold-value-input').fill('100');

		await card.getByRole('button', { name: /save changes/i }).click();
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Thresholds');
		await expect(page.locator('.threshold-container').first()).toBeVisible();

		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` after stack rebuild.
		await firstCard.locator('button.delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-12 panel type swap from Bar to Time Series and back persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Time Series');

		// Editor-side visual change: Time-Series-only section appears.
		await expect(page.locator('section.fill-gaps').first()).toBeVisible();
		await expect(page.locator('section.stack-chart')).toHaveCount(0);

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=graph/);

		await changePanelType(page, 'Bar');
		await saveWidgetEdit(page);
	});

	test('TC-13 sections hidden for BAR are not rendered', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// Hidden by the panel-type matrix for BAR.
		await expect(page.locator('section.fill-gaps')).toHaveCount(0);
		await expect(page.locator('.column-unit-selector')).toHaveCount(0);

		// Expected to be present.
		await expect(page.getByTestId('panel-name-input')).toBeVisible();
		await expect(page.getByTestId('panel-change-select')).toBeVisible();
		await expect(page.locator('section.stack-chart').first()).toBeVisible();
		await expect(page.locator('section.panel-time-preference').first()).toBeVisible();

		await expandSection(page, 'Axes');
		await expect(page.locator('section.soft-min-max').first()).toBeVisible();
		await expect(page.locator('section.log-scale').first()).toBeVisible();

		await expandSection(page, 'Legend');
		await expect(page.locator('section.legend-position').first()).toBeVisible();

		await expandSection(page, 'Formatting & Units');
		await expect(page.getByTestId('decimal-precision-selector')).toBeVisible();

		await expandSection(page, 'Thresholds');
		await expect(page.getByTestId('add-threshold-cta')).toBeVisible();
	});

	test('TC-14 discarding right-pane changes does not persist', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-bar-test');

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
