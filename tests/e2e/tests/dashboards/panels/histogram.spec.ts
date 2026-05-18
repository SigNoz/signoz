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

const FIXTURE_DASHBOARD_TITLE = 'histogram-controls-fixture';
const FIXTURE_PANEL_TITLE = 'histogram-controls-panel';

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
		await changePanelType(page, 'Histogram');
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

test.describe('Histogram Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('histogram-controls-renamed');
		await saveWidgetEdit(page);
		await expect(
			page.getByTestId('histogram-controls-renamed').first(),
		).toBeVisible();

		await openWidgetEditor(page, 'histogram-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'histogram-controls-renamed',
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
			.fill('E2E histogram description');
		await saveWidgetEdit(page);

		const header = page
			.locator('.widget-header-container')
			.filter({ hasText: FIXTURE_PANEL_TITLE });
		await expect(header.locator('.info-tooltip').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page.getByTestId('panel-description-input')).toHaveValue(
			'E2E histogram description',
		);

		await page.getByTestId('panel-description-input').fill('');
		await saveWidgetEdit(page);
		await expect(header.locator('.info-tooltip')).toHaveCount(0);
	});

	test('TC-03 bucket count and bucket width persist (canvas-only visual)', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// Section is titled "Histogram / Buckets" — literal slash + spaces.
		await expandSection(page, 'Histogram / Buckets');

		const bucketCount = page.locator('.bucket-input .ant-input-number-input').first();
		const bucketWidth = page
			.locator('.histogram-settings__bucket-input .ant-input-number-input')
			.first();

		await bucketCount.fill('50');
		await bucketWidth.fill('1.5');
		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Histogram / Buckets');
		await expect(
			page.locator('.bucket-input .ant-input-number-input').first(),
		).toHaveValue('50');
		await expect(
			page
				.locator('.histogram-settings__bucket-input .ant-input-number-input')
				.first(),
		// Ant InputNumber with precision={2} formats 1.5 → "1.50"
		).toHaveValue('1.50');

		// Reset
		await page
			.locator('.bucket-input .ant-input-number-input')
			.first()
			.fill('');
		await page
			.locator('.histogram-settings__bucket-input .ant-input-number-input')
			.first()
			.fill('');
		await saveWidgetEdit(page);
	});

	test('TC-04 "Merge all series" toggle removes .legend-container from the DOM', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expandSection(page, 'Histogram / Buckets');

		// Live preview: legend should be present when toggle is OFF.
		// (Use `.first()` because the editor may render multiple chart areas.)
		await expect(page.locator('.legend-container').first()).toBeVisible();

		const mergeSwitch = page
			.locator('section.histogram-settings__combine-hist')
			.getByRole('switch');
		await expect(mergeSwitch).toHaveAttribute('aria-checked', 'false');
		await mergeSwitch.click();
		await expect(mergeSwitch).toHaveAttribute('aria-checked', 'true');

		// Histogram passes `showLegend={!isQueriesMerged}` → legend container is
		// not rendered when the merge toggle is ON.
		await expect(page.locator('.legend-container')).toHaveCount(0);

		await saveWidgetEdit(page);

		// Dashboard render: legend container also absent.
		await expect(page.locator('.legend-container')).toHaveCount(0);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Histogram / Buckets');
		await expect(
			page
				.locator('section.histogram-settings__combine-hist')
				.getByRole('switch'),
		).toHaveAttribute('aria-checked', 'true');

		// Reset
		await page
			.locator('section.histogram-settings__combine-hist')
			.getByRole('switch')
			.click();
		await saveWidgetEdit(page);
		await expect(page.locator('.legend-container').first()).toBeVisible();
	});

	test('TC-05 Legend Colors panel renders one row per query series with a default color swatch', async ({
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

	test('TC-06 panel type swap from Histogram to Time Series and back persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Time Series');

		// Editor-side visual change: Time Series sections appear, Histogram-only
		// section disappears.
		await expect(page.locator('section.fill-gaps').first()).toBeVisible();
		await expect(page.locator('.histogram-settings__bucket-config')).toHaveCount(0);

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=graph/);

		// Reset
		await changePanelType(page, 'Histogram');
		await saveWidgetEdit(page);
	});

	test('TC-07 sections hidden for HISTOGRAM are not rendered', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expect(page.locator('section.panel-time-preference')).toHaveCount(0);
		await expect(page.locator('section.fill-gaps')).toHaveCount(0);
		await expect(page.locator('section.stack-chart')).toHaveCount(0);
		await expect(page.locator('section.soft-min-max')).toHaveCount(0);
		await expect(page.locator('section.log-scale')).toHaveCount(0);
		await expect(page.locator('section.legend-position')).toHaveCount(0);
		await expect(page.locator('.y-axis-unit-selector-v2')).toHaveCount(0);
		await expect(page.locator('.decimal-precision-selector')).toHaveCount(0);
		await expect(page.locator('.column-unit-selector')).toHaveCount(0);
		await expect(page.getByTestId('add-threshold-cta')).toHaveCount(0);

		await expect(page.getByTestId('panel-name-input')).toBeVisible();
		await expect(page.getByTestId('panel-change-select')).toBeVisible();

		await expandSection(page, 'Histogram / Buckets');
		await expect(
			page.locator('.histogram-settings__bucket-config').first(),
		).toBeVisible();

		await expandSection(page, 'Legend');
		await expect(page.locator('.legend-colors-collapse').first()).toBeVisible();
	});

	test('TC-08 discarding right-pane changes does not persist', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-histogram-test');

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
