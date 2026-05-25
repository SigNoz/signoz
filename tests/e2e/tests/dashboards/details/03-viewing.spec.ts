import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	APM_METRICS_TITLE,
	authToken,
	createDashboardViaApi,
	deleteDashboardViaApi,
	createApmMetricsDashboardViaApi,
} from '../../../helpers/dashboards';

const seedIds = new Set<string>();
const BASE_TITLE = 'detail-viewing-base';
let baseDashboardId = '';
let apmDashboardId = '';

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		baseDashboardId = await createDashboardViaApi(page, BASE_TITLE);
		seedIds.add(baseDashboardId);
		apmDashboardId = await createApmMetricsDashboardViaApi(page);
		seedIds.add(apmDashboardId);
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) {
		return;
	}
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

async function gotoDetail(page: Page, id: string): Promise<void> {
	await page.goto(`/dashboard/${id}`);
}

test.describe('Dashboard Detail Page — Viewing', () => {
	test('TC-01 page chrome — breadcrumb, title, toolbar buttons render', async ({
		authedPage: page,
	}) => {
		// Use the APM dashboard rather than the empty base — empty dashboards
		// render an onboarding canvas with its own Configure / New Panel
		// buttons, which duplicate the toolbar testids.
		await gotoDetail(page, apmDashboardId);

		await expect(
			page.getByRole('button', { name: /Dashboard \// }),
		).toBeVisible();
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await expect(page).toHaveTitle(new RegExp(APM_METRICS_TITLE));

		await expect(
			page.getByRole('textbox', { name: /Last \d+/ }).first(),
		).toBeVisible();
		await expect(page.locator('.refresh-btn button')).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Set auto refresh' }),
		).toBeVisible();
		await expect(page.getByTestId('options')).toBeVisible();
		await expect(page.getByTestId('show-drawer')).toBeVisible();
		await expect(page.getByTestId('add-panel-header')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Feedback' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
	});

	test('TC-02 breadcrumb returns to /dashboard', async ({
		authedPage: page,
	}) => {
		await gotoDetail(page, baseDashboardId);
		await expect(
			page.getByRole('button', { name: /Dashboard \// }),
		).toBeVisible();

		// `dispatchEvent('click')` — the expanded sidenav intercepts pointer
		// events at the breadcrumb's center, defeating even `force: true`.
		// Dispatching the click directly on the DOM node bypasses hit testing.
		await page
			.getByRole('button', { name: 'Dashboard /' })
			.dispatchEvent('click');

		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
	});

	test('TC-03 tags bar renders for an imported dashboard', async ({
		authedPage: page,
	}) => {
		await gotoDetail(page, apmDashboardId);
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();

		// `exact: true` is load-bearing — `apm` is a substring of the
		// breadcrumb title `APM Metrics`, so a loose match would collide.
		for (const tag of ['apm', 'latency', 'error rate', 'throughput']) {
			await expect(page.getByText(tag, { exact: true })).toBeVisible();
		}
	});

	test('TC-04 section row headers render for APM Metrics', async ({
		authedPage: page,
	}) => {
		await gotoDetail(page, apmDashboardId);

		// known behaviour: APM Metrics fixture has two sections both named
		// "Overview" — `.first()` deliberately matches whichever renders first.
		await expect(
			page.getByText('Overview', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('DB Metrics', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('External calls', { exact: true }).first(),
		).toBeVisible();
	});

	test('TC-05 at least one panel container renders', async ({
		authedPage: page,
	}) => {
		await gotoDetail(page, apmDashboardId);
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();

		await expect(
			page.getByText('Latency', { exact: true }).first(),
		).toBeVisible();
	});

	test('TC-06 no JS pageerror during initial load', async ({
		authedPage: page,
	}) => {
		const errors: Error[] = [];
		page.on('pageerror', (err) => errors.push(err));

		await gotoDetail(page, apmDashboardId);
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();
		await expect(
			page.getByText('Latency', { exact: true }).first(),
		).toBeVisible();

		expect(errors).toHaveLength(0);
	});

	// ─── Cross-spec: connection with the dashboards-list page ────────────────

	test('TC-07 navigating from the dashboards list lands on the detail page', async ({
		authedPage: page,
	}) => {
		await page.goto('/dashboard');
		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();

		await page
			.getByPlaceholder('Search by name, description, or tags...')
			.fill(APM_METRICS_TITLE);
		await expect(page.getByText(APM_METRICS_TITLE).first()).toBeVisible();
		const actionIcon = page.getByTestId('dashboard-action-icon').first();
		await actionIcon.scrollIntoViewIfNeeded();
		await actionIcon.click();
		await page.getByRole('tooltip').getByRole('button', { name: 'View' }).click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();
		await expect(
			page.getByText('Latency', { exact: true }).first(),
		).toBeVisible();
	});
});
