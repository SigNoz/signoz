import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	changePanelType,
	configureAndSavePanel,
	createDashboardViaApi,
	deleteDashboardViaApi,
	fetchDashboardData,
	findDashboardIdByTitle,
	openWidgetEditor,
	saveWidgetEdit,
} from '../../../helpers/dashboards';

test.describe.configure({ mode: 'serial' });

const FIXTURE_DASHBOARD_TITLE = 'list-controls-fixture';
const FIXTURE_PANEL_TITLE = 'list-controls-panel';

const seedIds = new Set<string>();

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const id = await createDashboardViaApi(page, FIXTURE_DASHBOARD_TITLE);
		seedIds.add(id);
		await page.goto(`/dashboard/${id}`);
		await page.getByTestId('add-panel').waitFor({ state: 'visible' });
		// LIST panels require a logs (or traces) data source — metrics queries
		// hide the LIST option from panel-change-select.
		await configureAndSavePanel(page, 'logs', FIXTURE_PANEL_TITLE);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await changePanelType(page, 'List');
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

/** Fetch the persisted fixture dashboard's first widget. */
async function fetchFixtureWidget(page: Page) {
	const id = await findDashboardIdByTitle(page, FIXTURE_DASHBOARD_TITLE);
	expect(id, `${FIXTURE_DASHBOARD_TITLE} not found`).toBeTruthy();
	const dashboard = await fetchDashboardData(page, id!);
	const widget = dashboard.widgets?.[0];
	expect(widget, 'fixture dashboard must have at least one widget').toBeTruthy();
	return widget!;
}

test.describe('List Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('list-controls-renamed');
		await saveWidgetEdit(page);
		await expect(page.getByTestId('list-controls-renamed').first()).toBeVisible();

		// Server-side check.
		expect((await fetchFixtureWidget(page)).title).toBe('list-controls-renamed');

		await openWidgetEditor(page, 'list-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'list-controls-renamed',
		);

		await page.getByTestId('panel-name-input').fill(FIXTURE_PANEL_TITLE);
		await saveWidgetEdit(page);
	});

	test('TC-02 description persists and shows info icon on header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.getByTestId('panel-description-input')
			.fill('E2E list description');
		await saveWidgetEdit(page);

		await expect(
			page
				.locator('.widget-header-container')
				.filter({ hasText: FIXTURE_PANEL_TITLE })
				.locator('.info-tooltip')
				.first(),
		).toBeVisible();

		expect((await fetchFixtureWidget(page)).description).toBe('E2E list description');

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page.getByTestId('panel-description-input')).toHaveValue(
			'E2E list description',
		);

		await page.getByTestId('panel-description-input').fill('');
		await saveWidgetEdit(page);
	});

	test('TC-03 panel type switch from List to Table persists and re-renders', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Table');
		// Table re-renders Decimal Precision + Column Units in the right pane.
		await expect(page.getByTestId('decimal-precision-selector')).toBeVisible();

		await saveWidgetEdit(page);

		// Panel card should now render an Ant table head.
		await expect(
			page
				.locator('[data-testid="' + FIXTURE_PANEL_TITLE + '"]')
				.first(),
		).toBeVisible();
		await expect(page.locator('.ant-table-thead').first()).toBeVisible();

		// Server-side: panelTypes is 'table'.
		expect((await fetchFixtureWidget(page)).panelTypes).toBe('table');

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=table/);

		// Reset back to List.
		await changePanelType(page, 'List');
		await saveWidgetEdit(page);
	});

	test('TC-04 sections hidden for LIST are not rendered in the right pane', async ({
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
		await expect(page.locator('.decimal-precision-selector')).toHaveCount(0);
		await expect(page.locator('.column-unit-selector')).toHaveCount(0);
		await expect(page.locator('.y-axis-unit-selector-v2')).toHaveCount(0);
		await expect(page.getByTestId('add-threshold-cta')).toHaveCount(0);

		await expect(page.getByTestId('panel-name-input')).toBeVisible();
		await expect(page.getByTestId('panel-description-input')).toBeVisible();
		await expect(page.getByTestId('panel-change-select')).toBeVisible();
	});

	test('TC-05 discarding right-pane changes does not persist', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-list-test');

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

		// Settle before asserting no PUT.
		await page.waitForLoadState('networkidle');
		expect(putFired).toBe(false);

		// Server-side double-check: persisted title is still the fixture name.
		expect((await fetchFixtureWidget(page)).title).toBe(FIXTURE_PANEL_TITLE);
	});

	// ─── Reload persistence ──────────────────────────────────────────────────

	test('TC-06 panel state survives a hard dashboard reload', async ({
		authedPage: page,
	}) => {
		// Save description + a non-default panel type, then hard-reload and
		// re-verify the panel card rehydrates with the right state.
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.getByTestId('panel-description-input')
			.fill('reload persistence description');
		await saveWidgetEdit(page);

		await page.reload();
		await page.getByTestId(FIXTURE_PANEL_TITLE).first().waitFor({ state: 'visible' });

		// Description info icon must render after rehydration.
		await expect(
			page
				.locator('.widget-header-container')
				.filter({ hasText: FIXTURE_PANEL_TITLE })
				.locator('.info-tooltip')
				.first(),
		).toBeVisible();

		// Server-side check post-reload — confirms the load path read the same JSON.
		const persisted = await fetchFixtureWidget(page);
		expect(persisted.description).toBe('reload persistence description');
		expect(persisted.panelTypes).toBe('list');

		// Reset.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await page.getByTestId('panel-description-input').fill('');
		await saveWidgetEdit(page);
	});
});
