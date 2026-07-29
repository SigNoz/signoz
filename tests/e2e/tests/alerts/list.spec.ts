import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import {
	ALERTS_LIST_PATH,
	createEmailChannelViaApi,
	createThresholdAlertViaApi,
	deleteAlertViaApi,
	deleteChannelViaApi,
	expectFirstPage,
	SEED_B_SEVERITIES,
	seedAlertRules,
} from '../../helpers/alerts';
import { newAdminContext } from '../../helpers/auth';

// LR-* — the Alert Rules list (`container/ListAlertRules`). Mutating scenarios
// (LR-14/15/16) seed their own throwaway rule rather than touching the shared
// SEED-B set, so a failed delete can't cascade into the read-only assertions.
test.describe.configure({ mode: 'serial' });

const SEED_COUNT = 12;
const NAME_PREFIX = 'e2e-alert-list';
/** Pinned in the URL so the page size never depends on the viewport height. */
const LIMIT = 10;

const seededRuleIds = new Set<string>();
let channelId = '';
let channelName = '';

function listUrl(params: Record<string, string> = {}): string {
	const query = new URLSearchParams({ limit: String(LIMIT), ...params });
	return `${ALERTS_LIST_PATH}?${query.toString()}`;
}

/** Rows currently rendered in the table body. */
function ruleRows(page: Page) {
	return page.locator('tbody tr');
}

async function gotoList(
	page: Page,
	params: Record<string, string> = {},
): Promise<void> {
	await page.goto(listUrl(params));
	await expect(page.getByTestId('list-alerts-search-input')).toBeVisible();
	await expect(ruleRows(page).first()).toBeVisible();
}

/**
 * Register the rule a Clone/Duplicate response created, so `afterAll` removes
 * it too. Lives outside the test body because the id may legitimately be
 * missing and a conditional inside a test is a lint error.
 */
async function registerCreatedRule(response: {
	json: () => Promise<unknown>;
}): Promise<void> {
	const body = (await response.json()) as { data?: { id?: string } };
	const id = body.data?.id;
	if (id) {
		seededRuleIds.add(String(id));
	}
}

/** Seed a rule outside SEED-B and register it for suite cleanup. */
async function seedOwnRule(page: Page, name: string): Promise<string> {
	const id = await createThresholdAlertViaApi(page, {
		name,
		target: 42,
		channels: [channelName],
		labels: { severity: 'critical' },
	});
	seededRuleIds.add(id);
	return id;
}

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-alert-list-ch-${Date.now()}`,
		);
		channelId = channel.id;
		channelName = channel.name;
		for (const id of await seedAlertRules(
			page,
			SEED_COUNT,
			channel.name,
			NAME_PREFIX,
		)) {
			seededRuleIds.add(id);
		}
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		for (const id of seededRuleIds) {
			// eslint-disable-next-line no-await-in-loop
			await deleteAlertViaApi(page, id);
			seededRuleIds.delete(id);
		}
		if (channelId) {
			await deleteChannelViaApi(page, channelId);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Alert rules list', () => {
	test('LR-01 rules render with all default columns', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		// Default-visible columns. Created/Updated At/By all carry
		// `defaultVisibility: false` in table.config.tsx, so they are *not*
		// rendered until enabled from the column selector — known behaviour,
		// covered by LR-10.
		for (const header of ['Status', 'Alert Name', 'Severity', 'Labels']) {
			await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
		}
		await expect(
			page.getByRole('columnheader', { name: 'Actions' }),
		).toBeVisible();
		for (const hidden of [
			'Created At',
			'Created By',
			'Updated At',
			'Updated By',
		]) {
			await expect(page.getByRole('columnheader', { name: hidden })).toHaveCount(
				0,
			);
		}

		await expect(ruleRows(page)).toHaveCount(LIMIT);
		await expect(page.getByTestId('alert-columns-button')).toBeVisible();
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('LR-02 empty state when no rules exist', async () => {
		// The suite shares one stack with SEED-B, so deleting every rule to reach
		// the empty state would race the other scenarios. Instead, assert the empty
		// state against a filter that matches nothing — the *no-rules* variant is
		// covered by the component tests in
		// `container/ListAlertRules/__tests__/ListAlertRules.empty.test.tsx`.
		test.skip(
			true,
			'AlertsEmptyState needs a zero-rule workspace; unreachable without ' +
				'tearing down SEED-B mid-suite. Covered by the component test.',
		);
	});

	test('LR-03 search by name', async ({ authedPage: page }) => {
		await gotoList(page);

		await page.getByTestId('list-alerts-search-input').fill(`${NAME_PREFIX}-03`);

		// The input is debounced (300ms) before it reaches the URL.
		await expect(page).toHaveURL(new RegExp(`search=${NAME_PREFIX}-03`));
		await expect(ruleRows(page)).toHaveCount(1);
		await expect(page.getByText(`${NAME_PREFIX}-03`)).toBeVisible();
	});

	test('LR-04 search by severity and by label', async ({ authedPage: page }) => {
		await gotoList(page);
		const search = page.getByTestId('list-alerts-search-input');

		// The placeholder promises name + severity + labels, so all three filter.
		// Assert what the *rows* are rather than a stack-wide count: other alert
		// specs share this workspace and seed rules with their own severities, so an
		// exact count would couple this scenario to their fixtures.
		const perSeverity = Math.floor(SEED_COUNT / SEED_B_SEVERITIES.length);

		await search.fill('warning');
		await expect(page).toHaveURL(/search=warning/);
		await expect(ruleRows(page)).not.toHaveCount(0);
		for (const row of await ruleRows(page).all()) {
			await expect(row).toContainText('warning');
		}
		expect(await ruleRows(page).count()).toBeGreaterThanOrEqual(perSeverity);

		// `team: payments` sits on every odd-indexed SEED-B rule and nowhere else.
		await search.fill('payments');
		await expect(page).toHaveURL(/search=payments/);
		await expect(ruleRows(page)).toHaveCount(SEED_COUNT / 2);
	});

	test('LR-05 no-results state and clear', async ({ authedPage: page }) => {
		await gotoList(page);

		await page
			.getByTestId('list-alerts-search-input')
			.fill('no-such-alert-anywhere');

		await expect(page.getByText('No matching alert rules')).toBeVisible();

		await page.getByRole('button', { name: 'Clear Search' }).click();

		await expect(page).not.toHaveURL(/search=/);
		await expect(ruleRows(page)).toHaveCount(LIMIT);
	});

	test('LR-06 search resets pagination', async ({ authedPage: page }) => {
		await gotoList(page, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);

		await page.getByTestId('list-alerts-search-input').fill(NAME_PREFIX);

		await expectFirstPage(page);
	});

	test('LR-07 pagination', async ({ authedPage: page }) => {
		// Scope to SEED-B by name: neighbouring alert specs share this workspace, so
		// the unfiltered total is not this suite's to predict.
		await gotoList(page, { search: NAME_PREFIX });

		await expect(page.getByTestId('pagination-total-count')).toContainText(
			`of ${SEED_COUNT}`,
		);
		await expect(ruleRows(page)).toHaveCount(LIMIT);

		await page.getByLabel('Go to next page').click();

		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(ruleRows(page)).toHaveCount(SEED_COUNT - LIMIT);
		await expect(page.getByTestId('pagination-total-count')).toContainText(
			`${LIMIT + 1} - ${SEED_COUNT}`,
		);
	});

	test('LR-08 page-size change', async ({ authedPage: page }) => {
		await gotoList(page, { search: NAME_PREFIX });
		await expect(ruleRows(page)).toHaveCount(LIMIT);

		await page.getByTestId('pagination-page-size').click();
		await page.getByRole('option', { name: '20', exact: true }).click();

		await expect(page).toHaveURL(/[?&]limit=20/);
		await expect(ruleRows(page)).toHaveCount(SEED_COUNT);
	});

	test('LR-09 sort by column', async ({ authedPage: page }) => {
		await gotoList(page);

		const firstCell = ruleRows(page).first();
		const ascFirst = await firstCell.textContent();

		await page.getByRole('button', { name: 'Alert Name' }).click();
		await expect(page).toHaveURL(/[?&]orderBy=/);

		// Toggle to the other direction and assert the head of the list moved.
		await page.getByRole('button', { name: 'Alert Name' }).click();
		await expect(page).toHaveURL(/[?&]orderBy=/);
		await expect(ruleRows(page).first()).not.toHaveText(ascFirst ?? '');
	});

	test('LR-10 column selector hides and shows a column', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toBeVisible();

		await page.getByTestId('alert-columns-button').click();
		await page.getByText('Toggle Columns').waitFor();
		const severityToggle = page.locator('label', { hasText: 'Severity' });
		await severityToggle.click();

		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toHaveCount(0);

		// The choice lives in localStorage under `alert-rules-columns`, so it
		// survives a reload.
		await page.reload();
		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toHaveCount(0);

		await page.getByTestId('alert-columns-button').click();
		await page.locator('label', { hasText: 'Severity' }).click();
		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toBeVisible();
	});

	test('LR-11 row click opens the overview', async ({ authedPage: page }) => {
		await gotoList(page);

		await ruleRows(page).first().click();

		await expect(page).toHaveURL(/\/alerts\/overview\?/);
		await expect(page).toHaveURL(/[?&]ruleId=/);
		await expect(page).toHaveURL(/[?&]compositeQuery=/);
		await expect(page).toHaveURL(/[?&]panelTypes=/);
	});

	test('LR-12 ctrl/cmd-click opens the overview in a new tab', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		const [newPage] = await Promise.all([
			page.context().waitForEvent('page'),
			ruleRows(page)
				.first()
				.click({ modifiers: ['ControlOrMeta'] }),
		]);

		await newPage.waitForLoadState();
		expect(newPage.url()).toContain('/alerts/overview');
		expect(newPage.url()).toContain('ruleId=');
		await newPage.close();
	});

	test('LR-13 actions menu — Edit and Edit in New Tab', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await ruleRows(page).first().getByTestId('alert-actions').click();
		await page.getByRole('menuitem', { name: 'Edit in New Tab' }).waitFor();

		const [newPage] = await Promise.all([
			page.context().waitForEvent('page'),
			page.getByRole('menuitem', { name: 'Edit in New Tab' }).click(),
		]);
		await newPage.waitForLoadState();
		expect(newPage.url()).toContain('/alerts/overview');
		await newPage.close();

		await ruleRows(page).first().getByTestId('alert-actions').click();
		await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();

		await expect(page).toHaveURL(/\/alerts\/overview\?/);
		await expect(page).toHaveURL(/[?&]ruleId=/);
	});

	test('LR-14 actions menu — Disable then Enable', async ({
		authedPage: page,
	}) => {
		const name = `e2e-alert-list-toggle-${Date.now()}`;
		const ruleId = await seedOwnRule(page, name);

		await gotoList(page, { search: name });
		const row = ruleRows(page).first();
		await expect(row.getByTestId(`alert-row-${ruleId}-state`)).toHaveText('OK');

		await row.getByTestId('alert-actions').click();
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			page.getByRole('menuitem', { name: 'Disable' }).click(),
		]);

		await expect(row.getByTestId(`alert-row-${ruleId}-state`)).toHaveText(
			'Disabled',
		);

		// The menu label flips with the rule's state.
		await row.getByTestId('alert-actions').click();
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			page.getByRole('menuitem', { name: 'Enable' }).click(),
		]);

		await expect(row.getByTestId(`alert-row-${ruleId}-state`)).toHaveText('OK');
	});

	test('LR-15 actions menu — Clone', async ({ authedPage: page }) => {
		const name = `e2e-alert-list-clone-${Date.now()}`;
		await seedOwnRule(page, name);

		await gotoList(page, { search: name });
		await ruleRows(page).first().getByTestId('alert-actions').click();

		const [createResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules$/.test(new URL(res.url()).pathname) &&
					res.request().method() === 'POST',
			),
			page.getByRole('menuitem', { name: 'Clone' }).click(),
		]);

		await registerCreatedRule(createResponse);

		await expect(page.getByText('Alert cloned successfully')).toBeVisible();

		// Clone navigates to the copy's overview; go back and confirm it is listed.
		await gotoList(page, { search: name });
		await expect(page.getByText(`${name} - Copy`)).toBeVisible();
	});

	test('LR-16 actions menu — Delete', async ({ authedPage: page }) => {
		const name = `e2e-alert-list-delete-${Date.now()}`;
		const ruleId = await seedOwnRule(page, name);

		await gotoList(page, { search: name });
		await ruleRows(page).first().getByTestId('alert-actions').click();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'DELETE',
			),
			page.getByRole('menuitem', { name: 'Delete' }).click(),
		]);

		await expect(page.getByText('Alert deleted successfully')).toBeVisible();
		seededRuleIds.delete(ruleId);
		await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	});

	test('LR-17 New Alert button', async ({ authedPage: page }) => {
		await gotoList(page);

		await page.getByTestId('list-alerts-new-alert-button').click();

		await expect(page).toHaveURL(/\/alerts\/new/);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('LR-18 list load error shows ErrorEmptyState', async () => {
		test.skip(
			true,
			'Not covered: the suite never stubs network, and there is no server-side ' +
				'way to make GET /api/v1/rules fail on demand. Left explicitly ' +
				'untested rather than mocked.',
		);
	});
});
