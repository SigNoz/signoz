import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	createApmMetricsDashboardViaApi,
	deleteDashboardViaApi,
} from '../../../helpers/dashboards';

// This file's scope is intentionally narrow: prove that the detail page's
// "Edit panel" entry-point lands the user in the panel editor at
// `/dashboard/:id/new?widgetId=…`. Editor-internal behaviour (Query Builder
// pre-population, ClickHouse tab, Panel Settings rename, query-edit + revert,
// y-axis units, panel-type changes, etc.) is the responsibility of a separate
// panel-editor spec — keep this file as the dashboard-side seam only.

const seedIds = new Set<string>();
let apmDashboardId = '';

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		apmDashboardId = await createApmMetricsDashboardViaApi(page);
		seedIds.add(apmDashboardId);
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
		for (const id of seedIds) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboard Detail — Edit Panel (entry-point only)', () => {
	test('TC-01 Edit menu item on a panel navigates to the panel editor', async ({
		authedPage: page,
	}) => {
		await page.goto(`/dashboard/${apmDashboardId}`);
		await expect(
			page.getByRole('button', { name: /dashboard-icon APM Metrics/ }),
		).toBeVisible();

		// "DB Calls RPS" is the only single-instance panel name in the APM
		// Metrics fixture (other titles like "Latency" repeat across sections),
		// so it round-trips uniquely without `.first()` gymnastics.
		const panelTitle = page.getByText('DB Calls RPS', { exact: true }).first();
		await panelTitle.scrollIntoViewIfNeeded();

		// Walk up to the widget-graph container. Its `:hover` flips the ⋮ icon
		// from `visibility: hidden` to visible (see GridCardLayout.styles.scss
		// rule on `.widget-graph-component-container:hover .options-action`).
		const container = panelTitle.locator(
			'xpath=ancestor::*[contains(@class,"widget-graph-component-container")][1]',
		);
		await container.hover();

		const options = container.getByTestId('widget-header-options');
		// The ⋮ uses an antd `Dropdown` with `trigger=['hover']`; firing a real
		// hover (not `dispatchEvent('click')`) is what opens the menu.
		await options.hover({ force: true });

		await page.getByRole('menuitem', { name: 'Edit' }).click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+\/new\?.*widgetId=/);
		await expect(page.getByTestId('new-widget-save')).toBeVisible();
	});
});
