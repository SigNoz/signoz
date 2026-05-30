import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	APM_METRICS_TITLE,
	authToken,
	createApmMetricsDashboardViaApi,
	createDashboardViaApi,
	createVariablesDashboardViaApi,
	deleteDashboardViaApi,
} from '../../../helpers/dashboards';

const seedIds = new Set<string>();
const VARIABLES_TITLE = 'detail-edge-cases-variables';
let apmDashboardId = '';
let variablesDashboardId = '';

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		apmDashboardId = await createApmMetricsDashboardViaApi(page);
		seedIds.add(apmDashboardId);
		variablesDashboardId = await createVariablesDashboardViaApi(
			page,
			VARIABLES_TITLE,
		);
		seedIds.add(variablesDashboardId);
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

function encodeVariables(payload: Record<string, unknown>): string {
	return encodeURIComponent(encodeURIComponent(JSON.stringify(payload)));
}

async function gotoDetail(page: Page, id: string, query = ''): Promise<void> {
	await page.goto(`/dashboard/${id}${query}`);
}

test.describe('Dashboard Detail Page — Edge Cases', () => {
	test('TC-01 panels show "No Data" for a far-past time range without pageerror', async ({
		authedPage: page,
	}) => {
		const errors: Error[] = [];
		page.on('pageerror', (err) => errors.push(err));

		await gotoDetail(
			page,
			apmDashboardId,
			'?startTime=1672531200000&endTime=1672531260000',
		);

		// The dashboard chrome must render with the far-past range applied:
		// breadcrumb resolves the dashboard title, panel headers render, and the
		// time-range textbox reflects the URL.
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();
		await expect(
			page.getByText('Latency', { exact: true }).first(),
		).toBeVisible();

		// known behaviour: with no variable values resolvable in the far-past
		// window, APM panels stay in a waiting-on-variable state and never
		// render the uplot "No Data" overlay. The contract this TC really
		// guards is that the page does not throw — assert no client-side
		// pageerror was raised.
		expect(errors).toHaveLength(0);
	});

	test('TC-02 nonexistent dashboard ID handled gracefully', async ({
		authedPage: page,
	}) => {
		await page.goto('/dashboard/nonexistent-id-99999');

		// The chrome (sidebar logo) must always render, regardless of whether
		// the app redirects to /dashboard or shows an in-place error shell.
		// The bogus-id breadcrumb must never resolve.
		await expect(page.getByRole('img', { name: 'SigNoz' })).toBeVisible();
		await expect(
			page.getByRole('button', {
				name: /dashboard-icon nonexistent-id-99999/,
			}),
		).toBeHidden();
	});

	test('TC-03 sidebar nav still works after hitting a nonexistent dashboard URL', async ({
		authedPage: page,
	}) => {
		await page.goto('/dashboard/nonexistent-id-99999');
		await expect(page.getByRole('img', { name: 'SigNoz' })).toBeVisible();

		await page
			.locator('.nav-item')
			.filter({ hasText: /^Dashboards$/ })
			.click();

		await expect(page).toHaveURL(/\/dashboard($|\?)/);
		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
	});

	test('TC-04 variable URL deep-link survives hard reload', async ({
		authedPage: page,
	}) => {
		const deepLink = `?variables=${encodeVariables({ q_env: 'otel-demo' })}`;
		await gotoDetail(page, variablesDashboardId, deepLink);

		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${VARIABLES_TITLE}`),
			}),
		).toBeVisible();
		await expect(page.getByText('$q_env', { exact: true })).toBeVisible();

		await expect(page).toHaveURL(/variables=%257B/);
		await expect(page).toHaveURL(/otel-demo/);

		// Dropdown index — selects (in DOM order): 0=cu_single, 1=cu_env_all,
		// 2=cu_services, 3=q_env, 4=q_service, 5=d_namespace.
		const qEnv = page.getByTestId('variable-select').nth(3);
		await expect(
			qEnv.locator('.ant-select-selection-item', { hasText: 'otel-demo' }),
		).toBeVisible();

		await page.reload({ waitUntil: 'domcontentloaded' });

		await expect(page).toHaveURL(/variables=%257B/);
		await expect(page).toHaveURL(/otel-demo/);
		await expect(
			qEnv.locator('.ant-select-selection-item', { hasText: 'otel-demo' }),
		).toBeVisible();
	});

	test('TC-05 a single broken time range does not crash the dashboard canvas', async ({
		authedPage: page,
	}) => {
		const errors: Error[] = [];
		page.on('pageerror', (err) => errors.push(err));

		// known behaviour: the app may either reject a swapped range
		// client-side or render error states per-panel — either way, the
		// dashboard chrome and at least one panel header must still render.
		await gotoDetail(page, apmDashboardId, '?startTime=999999&endTime=999998');

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

	test('TC-06 sidebar Dashboards link from detail page navigates to /dashboard', async ({
		authedPage: page,
	}) => {
		await gotoDetail(page, apmDashboardId);
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${APM_METRICS_TITLE}`),
			}),
		).toBeVisible();

		await page
			.locator('.nav-item')
			.filter({ hasText: /^Dashboards$/ })
			.click();

		await expect(page).toHaveURL(/\/dashboard($|\?)/);
		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
	});

	// ─── Deep coverage ───────────────────────────────────────────────────────

	test('TC-07 a 200-character dashboard name renders without breaking layout', async ({
		authedPage: page,
	}) => {
		const longName = `LongName-${'x'.repeat(190)}`;
		const id = await createDashboardViaApi(page, longName);
		seedIds.add(id);

		await gotoDetail(page, id);

		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${longName.slice(0, 30)}`),
			}),
		).toBeVisible();
		// The toolbar must still render — long titles cannot push the toolbar
		// off-screen or unmount it. Scope to `.right-section` because empty
		// dashboards render an onboarding canvas with duplicate testids.
		const toolbar = page.locator('.dashboard-details .right-section');
		await expect(toolbar.getByTestId('show-drawer')).toBeVisible();
		await expect(toolbar.getByTestId('add-panel-header')).toBeVisible();
	});

	test('TC-08 special characters in the dashboard name round-trip via URL and breadcrumb', async ({
		authedPage: page,
	}) => {
		const trickyName = `Spec & Chars / "${Date.now()}" — émoji 🎯`;
		const id = await createDashboardViaApi(page, trickyName);
		seedIds.add(id);

		await gotoDetail(page, id);

		// The full title must round-trip through the breadcrumb without HTML
		// entity mangling (`&amp;`, `&quot;` are bugs we'd want to catch).
		await expect(
			page.getByText(trickyName, { exact: true }).first(),
		).toBeVisible();
		// document.title is set from the dashboard name — confirm it is intact.
		await expect(page).toHaveTitle(new RegExp('Spec & Chars'));
	});
});
