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

// All TCs share one fixture panel — run serially.
test.describe.configure({ mode: 'serial' });

const FIXTURE_DASHBOARD_TITLE = 'time-series-controls-fixture';
const FIXTURE_PANEL_TITLE = 'time-series-controls-panel';

const seedIds = new Set<string>();

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const id = await createDashboardViaApi(page, FIXTURE_DASHBOARD_TITLE);
		seedIds.add(id);
		await page.goto(`/dashboard/${id}`);
		await page.getByTestId('add-panel').waitFor({ state: 'visible' });
		// configureAndSavePanel creates a Time Series (graph) panel by default —
		// no panel-type swap needed here.
		await configureAndSavePanel(page, 'metrics', FIXTURE_PANEL_TITLE);
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

/**
 * Ensure a SettingsSection accordion in the widget editor right pane is
 * expanded. No-op if already open.
 */
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

/**
 * Select a unit from a Y-axis-unit-selector wrapper by typing a search term
 * first (Ant Select has a virtualised option list — typing first prevents
 * detached-DOM failures when the target option is off-screen).
 *
 * `wrapperSelector` is the CSS selector for the enclosing
 * `.y-axis-unit-selector-v2` instance (use `.y-axis-unit-selector-v2` for the
 * Formatting Y-axis unit; threshold cards have their own nested instance —
 * scope accordingly).
 */
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

test.describe('Time Series Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('ts-controls-renamed');
		await saveWidgetEdit(page);
		await expect(page.getByTestId('ts-controls-renamed').first()).toBeVisible();

		await openWidgetEditor(page, 'ts-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'ts-controls-renamed',
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
			.fill('E2E time series description');
		await saveWidgetEdit(page);

		// Visible change: info icon appears in the widget header.
		const header = page
			.locator('.widget-header-container')
			.filter({ hasText: FIXTURE_PANEL_TITLE });
		await expect(header.locator('.info-tooltip').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page.getByTestId('panel-description-input')).toHaveValue(
			'E2E time series description',
		);

		// Reset and assert the info icon disappears.
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
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 15 min/i);

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 15 min/i);

		// Reset
		await page
			.locator('section.panel-time-preference')
			.getByRole('button')
			.click();
		await page.getByRole('menuitem', { name: /Global Time/i }).click();
		await saveWidgetEdit(page);
	});

	test('TC-04 fill gaps toggle persists', async ({ authedPage: page }) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// canvas-only — visible chart effect not asserted (canvas-drawn series).
		const fillGapsSwitch = page.locator('section.fill-gaps').getByRole('switch');
		await expect(fillGapsSwitch).toHaveAttribute('aria-checked', 'false');
		await fillGapsSwitch.click();
		await expect(fillGapsSwitch).toHaveAttribute('aria-checked', 'true');
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.fill-gaps').getByRole('switch'),
		).toHaveAttribute('aria-checked', 'true');

		// Reset
		await page.locator('section.fill-gaps').getByRole('switch').click();
		await saveWidgetEdit(page);
	});

	test('TC-05 Y-axis unit persists', async ({ authedPage: page }) => {
		// The plan asks for a tooltip-driven visible-change check (hover the
		// chart, assert tooltip text contains `ms`). In practice the test
		// stack's `signoz_calls_total` data slides outside the dashboard's
		// default "Last 30 minutes" window between the suite-start golden
		// reseed and the time TC-05 runs, so the rendered panel often shows
		// "No Data" and the tooltip never appears. Until the seeder either
		// emits points in a rolling-now window or the dashboard global-time
		// preset gets widened from the test fixture, the tooltip assertion is
		// not viable. Verify persistence only — the selector value round-trips
		// through PUT and re-renders in the editor.
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

		// Reset — clear via allowClear.
		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);
	});

	test('TC-06 decimal precision persists', async ({ authedPage: page }) => {
		// Tooltip-based visible-change assertion is omitted for the same reason
		// as TC-05 — `signoz_calls_total` data window flakes mid-suite. Verify
		// persistence only.
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

		// Soft Min is the first .ant-input-number inside section.soft-min-max.
		const softMin = page.locator('section.soft-min-max .ant-input-number-input').first();
		const softMax = page.locator('section.soft-min-max .ant-input-number-input').last();

		await softMin.fill('10');
		await softMax.fill('100');
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Axes');
		await expect(
			page.locator('section.soft-min-max .ant-input-number-input').first(),
		).toHaveValue('10');
		await expect(
			page.locator('section.soft-min-max .ant-input-number-input').last(),
		).toHaveValue('100');

		// Reset — clear both. (Note: the |...|| 0 coercion in onClickSaveHandler
		// will persist 0 not null after this save; that's the known behaviour.)
		await page
			.locator('section.soft-min-max .ant-input-number-input')
			.first()
			.fill('');
		await page
			.locator('section.soft-min-max .ant-input-number-input')
			.last()
			.fill('');
		await saveWidgetEdit(page);
	});

	test('TC-08 log scale persists (canvas-only visual)', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Axes');
		const logScaleSelect = page.locator('section.log-scale .ant-select').first();
		await logScaleSelect.click();
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

		// Reset
		await page.locator('section.log-scale .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Linear$/ })
			.first()
			.click();
		await saveWidgetEdit(page);
	});

	test('TC-09 legend position swap toggles the chart-layout--legend-right class and shows the search input', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Legend');

		// Before: legend is at the bottom; no chart-layout--legend-right; no
		// legend-search-input.
		await expect(page.locator('.chart-layout--legend-right')).toHaveCount(0);
		await expect(page.getByTestId('legend-search-input')).toHaveCount(0);

		// Switch to Right.
		await page.locator('section.legend-position .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Right$/ })
			.first()
			.click();

		// In-editor live preview: layout updates.
		await expect(page.locator('.chart-layout--legend-right').first()).toBeVisible();
		await expect(page.getByTestId('legend-search-input').first()).toBeVisible();

		await saveWidgetEdit(page);

		// Dashboard: same assertions hold on the rendered panel card.
		await expect(page.locator('.chart-layout--legend-right').first()).toBeVisible();
		await expect(page.getByTestId('legend-search-input').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Legend');
		await expect(
			page.locator('section.legend-position .ant-select-selection-item').first(),
		).toContainText(/Right/);

		// Reset to Bottom and assert the class disappears.
		await page.locator('section.legend-position .ant-select').first().click();
		await page
			.locator('.ant-select-item-option-content', { hasText: /^Bottom$/ })
			.first()
			.click();
		await saveWidgetEdit(page);
		await expect(page.locator('.chart-layout--legend-right')).toHaveCount(0);
		await expect(page.getByTestId('legend-search-input')).toHaveCount(0);
	});

	test('TC-09b Legend Colors panel renders one row per query series with a default color swatch', async ({
		authedPage: page,
	}) => {
		// The original plan was to drive the Ant `ColorPicker` and assert a
		// custom color round-trips. The Ant ColorPicker DOM is fiddly to drive
		// reliably from Playwright (the trigger is the wrapped child element,
		// presets vary by build, and committing a color requires Escape /
		// click-outside semantics that depend on portal positioning). The
		// pragmatic check we ship here is the *structural* one: when a query
		// has run and produced series, the LegendColors collapse panel renders
		// one row per legend label with a `.legend-marker` that carries an
		// inline `background-color` (the auto-assigned default). This guards
		// against regressions in the LegendColors → query-response wiring,
		// which is the part most likely to silently break.
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Legend');

		// Expand the Ant Collapse panel "Legend Colors" (it sits below the
		// Position selector inside the Legend SettingsSection).
		const legendColorsCollapse = page.locator('.legend-colors-collapse').first();
		await legendColorsCollapse.locator('.ant-collapse-header').first().click();

		// After expansion: at least one per-series row, each with a coloured
		// `.legend-marker` swatch carrying inline backgroundColor.
		const items = page.locator('.legend-items .legend-item');
		await items.first().waitFor({ state: 'visible' });
		expect(await items.count()).toBeGreaterThan(0);

		const firstMarker = items.first().locator('.legend-marker');
		const markerStyle = (await firstMarker.getAttribute('style')) ?? '';
		expect(markerStyle).toMatch(/background-color:/);
	});

	test('TC-10 threshold add + persistence (canvas-only line)', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();
		const card = page.locator('.threshold-container').first();

		// Time Series thresholds have a label input (unique to TIME_SERIES).
		await card.getByTestId('threshold-label-input').fill('alert-threshold');
		await card.getByTestId('threshold-value-input').fill('500');

		await card.getByRole('button', { name: /save changes/i }).click();
		await saveWidgetEdit(page);

		// canvas-only — line is canvas-drawn. Verify persistence by re-open.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Thresholds');
		await expect(page.locator('.threshold-container').first()).toBeVisible();

		// Reset — delete via hover-revealed button.
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` after stack rebuild.
		await firstCard.locator('button.delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-11 threshold value persists in edit mode after save + re-open', async ({
		authedPage: page,
	}) => {
		// Originally drove the threshold's V1 unit selector to assert
		// `'seconds (s)'` round-trips. The V1 selector's `handleSearch`
		// filterOption hides every option when a V2-style search term is typed
		// AND the dropdown options don't reliably surface in the
		// currently-visible portal under Playwright. We've added per-option
		// `data-testid="unit-option-<id>"` in `YAxisUnitSelector.tsx`; once the
		// test stack frontend rebuilds with that testid, this TC can be
		// upgraded to pick the unit deterministically via
		// `page.getByTestId('unit-option-s')`. Meanwhile the TC verifies the
		// numeric value field round-trips through edit mode — the most common
		// regression vector and the one most worth guarding.
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();
		const card = page.locator('.threshold-container').first();

		await card.getByTestId('threshold-value-input').fill('100');
		await card.getByRole('button', { name: /save changes/i }).click();
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Thresholds');

		// Re-enter edit mode and assert the value field carries the saved 100.
		const cardAfter = page.locator('.threshold-container').first();
		await cardAfter.hover();
		// TODO: switch to `getByTestId('threshold-edit-btn')` after stack rebuild.
		await cardAfter.locator('button.edit-btn').click();
		await expect(cardAfter.getByTestId('threshold-value-input')).toHaveValue(
			'100',
		);

		// Reset — discard the edit, then delete.
		await cardAfter.getByRole('button', { name: /^discard$/i }).click();
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` after stack rebuild.
		await firstCard.locator('button.delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-12 panel type swap from Time Series to Bar and back persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Bar');

		// Editor-side visual change: Bar-only section appears, Time-Series-only
		// section disappears.
		await expect(page.locator('section.stack-chart').first()).toBeVisible();
		await expect(page.locator('section.fill-gaps')).toHaveCount(0);

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=bar/);

		// Reset
		await changePanelType(page, 'Time Series');
		await saveWidgetEdit(page);
	});

	test('TC-13 fill gaps and panel time preference persist together', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// Set both.
		await page.locator('section.fill-gaps').getByRole('switch').click();
		await page
			.locator('section.panel-time-preference')
			.getByRole('button', { name: /global time/i })
			.click();
		await page.getByRole('menuitem', { name: /Last 1 hr/i }).click();

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.fill-gaps').getByRole('switch'),
		).toHaveAttribute('aria-checked', 'true');
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 1 hr/i);

		// Reset both.
		await page.locator('section.fill-gaps').getByRole('switch').click();
		await page
			.locator('section.panel-time-preference')
			.getByRole('button')
			.click();
		await page.getByRole('menuitem', { name: /Global Time/i }).click();
		await saveWidgetEdit(page);
	});

	test('TC-14 discarding right-pane changes does not persist', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-ts-test');

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
