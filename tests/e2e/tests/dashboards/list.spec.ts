import type { Locator, Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/dashboards';
import {
	createDashboardV2ViaApi,
	deleteDashboardV2ViaApi,
	WIDE_VIEWPORT,
} from '../../helpers/dashboards-v2';

// The V2 dashboards list: the views rail, the list itself, search, sort and pinning.
// Seeded through the v2 API, and every assertion is scoped to this suite's own
// dashboards — the workspace is shared, so counting rows or asserting on "the first
// row" would depend on what else exists.

test.use({ viewport: WIDE_VIEWPORT });

const seedIds = new Set<string>();
const RUN = `${Date.now()}-${process.env.TEST_WORKER_INDEX ?? '0'}`;
const listPath = '/dashboard';

/** A title unique to this run, so searches can only match what this suite made. */
const title = (label: string): string => `e2e-list-${label}-${RUN}`;

async function seed(page: Page, label: string): Promise<string> {
	const id = await createDashboardV2ViaApi(page, title(label));
	seedIds.add(id);
	return id;
}

async function gotoList(page: Page): Promise<void> {
	await page.goto(listPath);
	await expect(
		page.getByRole('heading', { name: 'All dashboards' }),
	).toBeVisible();
}

/** Rows are indexed, not keyed by name — find the row holding a given title. */
const rowByTitle = (page: Page, dashboardTitle: string): Locator =>
	page.locator('[data-testid^="dashboard-title-"]').filter({
		hasText: dashboardTitle,
	});

/** Type into the list's query box and run it. */
async function search(page: Page, term: string): Promise<void> {
	await page.getByTestId('dashboards-list-search').click();
	await page.keyboard.type(term);
	await page.getByTestId('dashboards-list-search-submit').click();
}

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) {
		return;
	}
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of seedIds) {
			await deleteDashboardV2ViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboards list', () => {
	test('TC-01 page chrome and core controls render', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await expect(page.getByRole('heading', { name: 'Views' })).toBeVisible();
		await expect(page.getByTestId('new-dashboard-cta')).toBeVisible();
		await expect(page.getByTestId('dashboards-list-search')).toBeVisible();
		await expect(page.getByTestId('sort-by')).toBeVisible();
	});

	test('TC-02 every view in the rail is reachable', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		for (const view of ['mine', 'pinned', 'recent', 'all', 'locked']) {
			await page.getByTestId(`dashboards-view-${view}`).click();
			await expect(page.getByTestId(`dashboards-view-${view}`)).toBeVisible();
			// The list frame survives every view switch, empty or not.
			await expect(page.getByTestId('dashboards-list-search')).toBeVisible();
		}
	});

	test('TC-03 a newly created dashboard is listed', async ({
		authedPage: page,
	}) => {
		await seed(page, 'listed');
		await gotoList(page);

		await expect(rowByTitle(page, title('listed'))).toBeVisible();
	});

	test('TC-04 opening a dashboard from the list lands on its detail page', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'open');
		await gotoList(page);

		await rowByTitle(page, title('open')).click();

		await expect(page).toHaveURL(new RegExp(`/dashboard/${id}`));
		await expect(page.getByTestId('dashboard-title')).toContainText(
			title('open'),
		);
	});

	test('TC-05 search narrows the list to a matching dashboard', async ({
		authedPage: page,
	}) => {
		await seed(page, 'searchable');
		await seed(page, 'other');
		await gotoList(page);

		await search(page, title('searchable'));

		await expect(rowByTitle(page, title('searchable'))).toBeVisible();
		await expect(rowByTitle(page, title('other'))).toBeHidden();
	});

	test('TC-06 a search matching nothing leaves no rows of ours', async ({
		authedPage: page,
	}) => {
		await seed(page, 'nomatch');
		await gotoList(page);

		await search(page, `${title('nomatch')}-absent`);

		await expect(rowByTitle(page, title('nomatch'))).toBeHidden();
	});

	test('TC-07 pinning a dashboard puts it in the Pinned view', async ({
		authedPage: page,
	}) => {
		await seed(page, 'pin');
		await gotoList(page);

		const row = rowByTitle(page, title('pin'));
		await expect(row).toBeVisible();
		// The pin control is indexed like the title it sits beside.
		const index = await row.getAttribute('data-testid');
		const pinIndex = (index ?? '').replace('dashboard-title-', '');
		await page.getByTestId(`dashboard-pin-${pinIndex}`).click();

		await page.getByTestId('dashboards-view-pinned').click();
		await expect(rowByTitle(page, title('pin'))).toBeVisible();
	});

	test('TC-08 the create CTA opens the new-dashboard modal', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page.getByTestId('new-dashboard-cta').click();

		for (const field of [
			'create-dashboard-name',
			'create-dashboard-description',
			'create-dashboard-tags',
		]) {
			await expect(page.getByTestId(field)).toBeVisible();
		}
		await expect(page.getByTestId('create-dashboard-submit')).toBeVisible();
	});

	test('TC-09 creating a dashboard through the modal lands on it', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await page.getByTestId('new-dashboard-cta').click();

		const name = title('via-modal');
		await page.getByTestId('create-dashboard-name').fill(name);
		await page.getByTestId('create-dashboard-submit').click();

		await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		await expect(page.getByTestId('dashboard-title')).toContainText(name);

		// Created through the UI, so register it for cleanup by id from the URL.
		const created = page.url().split('/dashboard/')[1]?.split('?')[0] ?? '';
		expect(created).not.toBe('');
		seedIds.add(created);
	});

	test('TC-10 a deleted dashboard leaves the list', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'deleted');
		await gotoList(page);
		await expect(rowByTitle(page, title('deleted'))).toBeVisible();

		const token = await authToken(page);
		await deleteDashboardV2ViaApi(page.request, id, token);
		seedIds.delete(id);

		await page.reload();
		await expect(
			page.getByRole('heading', { name: 'All dashboards' }),
		).toBeVisible();
		await expect(rowByTitle(page, title('deleted'))).toBeHidden();
	});
});
