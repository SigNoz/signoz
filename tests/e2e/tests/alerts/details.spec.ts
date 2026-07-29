import type { Page } from '@playwright/test';

import { expect, SEED_C_TEAM_LABEL, test } from '../../fixtures/alert-history';
import {
	ALERT_HISTORY_PATH,
	ALERT_OVERVIEW_PATH,
	ALERTS_LIST_PATH,
	createEmailChannelViaApi,
	createLogsAlertViaApi,
	deleteAlertViaApi,
	deleteChannelViaApi,
	DEFAULT_RELATIVE_TIME,
	gotoAlertHistory,
} from '../../helpers/alerts';
import { newAdminContext } from '../../helpers/auth';

// AD-* — the Alert Details shell: the v1/v2 header split, the actions menu, and
// the Overview ↔ History tab contract.
//
// Read-only scenarios use the shared `alertHistory` worker fixture (SEED-A's v2
// rule + SEED-C's legacy v1 rule over the same logs). Anything that renames,
// toggles, duplicates or deletes seeds its own throwaway rule — mutating the
// shared fixture would break every scenario scheduled after it.

const ownedRuleIds = new Set<string>();
let channelId = '';
let channelName = '';

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-alert-details-ch-${Date.now()}`,
		);
		channelId = channel.id;
		channelName = channel.name;
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		for (const id of ownedRuleIds) {
			// eslint-disable-next-line no-await-in-loop
			await deleteAlertViaApi(page, id);
			ownedRuleIds.delete(id);
		}
		if (channelId) {
			await deleteChannelViaApi(page, channelId);
		}
	} finally {
		await ctx.close();
	}
});

/**
 * Register the rule a Duplicate response created, so `afterAll` removes it too.
 * Lives outside the test body because the id may legitimately be missing and a
 * conditional inside a test is a lint error.
 */
async function registerCreatedRule(response: {
	json: () => Promise<unknown>;
}): Promise<void> {
	const body = (await response.json()) as { data?: { id?: string } };
	const id = body.data?.id;
	if (id) {
		ownedRuleIds.add(String(id));
	}
}

/**
 * Seed a throwaway rule for a mutating scenario. No telemetry is seeded for its
 * marker, so it never fires — these scenarios only care about the details shell.
 */
async function seedOwnRule(
	page: Page,
	name: string,
	schema: 'v1' | 'v2',
): Promise<string> {
	const id = await createLogsAlertViaApi(page, {
		name,
		marker: `e2e alert details never seeded ${name}`,
		channels: [channelName],
		schema,
	});
	ownedRuleIds.add(id);
	return id;
}

async function gotoOverview(page: Page, ruleId: string): Promise<void> {
	await page.goto(
		`${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}&relativeTime=${DEFAULT_RELATIVE_TIME}`,
	);
	await expect(page.getByTestId('alert-details-root')).toBeVisible();
}

test.describe('Alert details shell', () => {
	test('AD-01 v2 header is an editable name input with inline labels', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoOverview(page, alertHistory.ruleId);

		await expect(page.getByTestId('alert-details-root')).toHaveAttribute(
			'data-schema-version',
			'v2alpha1',
		);

		const nameInput = page.getByTestId('alert-name-input');
		await expect(nameInput).toBeVisible();
		await expect(nameInput).not.toHaveValue('');
		await expect(nameInput).toBeEditable();

		// v2 has no Rename item — the name is edited in place instead.
		await page.getByTestId('alert-actions-menu').click();
		await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveCount(0);
	});

	test('AD-02 v1 header is a static title with state, severity and labels', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoOverview(page, alertHistory.ruleIdV1);

		await expect(page.getByTestId('alert-details-root')).toHaveAttribute(
			'data-schema-version',
			'v1',
		);

		await expect(page.getByTestId('alert-header-title')).toBeVisible();
		await expect(page.getByTestId('alert-header-state')).toBeVisible();
		// SEED-C carries `labels.severity: warning`.
		await expect(page.getByTestId('alert-header-severity')).toContainText(
			'Warning',
		);
		// The header renders `labels` minus `severity` (that one becomes the chip
		// above), so SEED-C's `team` label is what shows up here.
		await expect(page.getByTestId('alert-header-labels')).toContainText(
			SEED_C_TEAM_LABEL,
		);
		await expect(page.getByTestId('alert-name-input')).toHaveCount(0);

		await page.getByTestId('alert-actions-menu').click();
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
	});

	test('AD-03 v1 rename flow', async ({ authedPage: page }) => {
		const stamp = Date.now();
		const original = `e2e-ad-rename-v1-${stamp}`;
		const renamed = `${original}-renamed`;
		const ruleId = await seedOwnRule(page, original, 'v1');

		await gotoOverview(page, ruleId);
		await expect(page.getByTestId('alert-header-title')).toContainText(original);

		await page.getByTestId('alert-actions-menu').click();
		await page.getByRole('menuitem', { name: 'Rename' }).click();

		const modalInput = page.getByTestId('alert-name');
		await expect(modalInput).toBeVisible();
		await modalInput.fill(renamed);
		await page.getByRole('button', { name: 'Rename Alert' }).click();

		await expect(page.getByText('Alert renamed successfully')).toBeVisible();
		await expect(page.getByTestId('alert-header-title')).toContainText(renamed);

		// The list is invalidated on success, so the new name shows up there too.
		await page.goto(`${ALERTS_LIST_PATH}?search=${renamed}`);
		await expect(page.getByText(renamed)).toBeVisible();
	});

	test('AD-04 v2 inline rename saves from the Overview footer', async ({
		authedPage: page,
	}) => {
		const stamp = Date.now();
		const original = `e2e-ad-rename-v2-${stamp}`;
		const renamed = `${original}-renamed`;
		const ruleId = await seedOwnRule(page, original, 'v2');

		await gotoOverview(page, ruleId);

		const nameInput = page.getByTestId('alert-name-input');
		await expect(nameInput).toHaveValue(original);
		await nameInput.fill(renamed);

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					['PUT', 'POST', 'PATCH'].includes(res.request().method()),
			),
			page.getByRole('button', { name: 'Save Alert Rule' }).click(),
		]);

		await page.goto(`${ALERTS_LIST_PATH}?search=${renamed}`);
		await expect(page.getByText(renamed)).toBeVisible();

		// On the History tab there is no footer, so the same edit only updates the
		// *displayed* name — locking this in catches a future "save on history"
		// change rather than asserting it silently persists.
		await gotoAlertHistory(page, ruleId);
		const historyInput = page.getByTestId('alert-name-input');
		await historyInput.fill(`${renamed}-unsaved`);
		await expect(
			page.getByRole('button', { name: 'Save Alert Rule' }),
		).toHaveCount(0);

		await page.goto(`${ALERTS_LIST_PATH}?search=${renamed}`);
		await expect(page.getByText(renamed)).toBeVisible();
		await expect(page.getByText(`${renamed}-unsaved`)).toHaveCount(0);
	});

	test('AD-05 Overview ↔ History tabs keep ruleId and relativeTime', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoOverview(page, alertHistory.ruleId);

		await page.getByTestId('alert-details-tab-history').click();

		await expect(page).toHaveURL(new RegExp(ALERT_HISTORY_PATH));
		await expect(page).toHaveURL(new RegExp(`ruleId=${alertHistory.ruleId}`));
		await expect(page).toHaveURL(
			new RegExp(`relativeTime=${DEFAULT_RELATIVE_TIME}`),
		);
		// The History tab carries a Beta tag.
		await expect(
			page.getByTestId('alert-details-tab-history').getByText('Beta'),
		).toBeVisible();

		await page.getByTestId('alert-details-tab-overview').click();

		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(new RegExp(`ruleId=${alertHistory.ruleId}`));
	});

	test('AD-05b switching to History discards the other history params', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// `useRouteTabUtils` hand-builds the History tab's search as literally
		// `ruleId=<id>&relativeTime=<v>` instead of carrying `urlQuery` over, so
		// every other param is dropped on the way in. Known behaviour — locked in
		// here so a change has to be deliberate.
		await gotoAlertHistory(page, alertHistory.ruleId, {
			page: '2',
			order: 'desc',
			timelineFilter: 'FIRED',
		});

		await page.getByTestId('alert-details-tab-overview').click();
		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		// Overview keeps `urlQuery` intact.
		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);

		await page.getByTestId('alert-details-tab-history').click();

		await expect(page).toHaveURL(new RegExp(ALERT_HISTORY_PATH));
		const search = new URL(page.url()).searchParams;
		expect([...search.keys()].sort()).toEqual(['relativeTime', 'ruleId']);
		expect(search.get('ruleId')).toBe(alertHistory.ruleId);
	});

	test('AD-06 enable/disable toggle', async ({ authedPage: page }) => {
		const ruleId = await seedOwnRule(page, `e2e-ad-toggle-${Date.now()}`, 'v2');

		await gotoOverview(page, ruleId);

		const toggle = page.getByTestId('alert-actions-toggle');
		await expect(toggle).toBeVisible();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			toggle.click(),
		]);

		await expect(page.getByText('Alert has been disabled.')).toBeVisible();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			toggle.click(),
		]);

		await expect(page.getByText('Alert has been enabled.')).toBeVisible();
	});

	test('AD-07 Duplicate navigates to the clone', async ({
		authedPage: page,
	}) => {
		const name = `e2e-ad-duplicate-${Date.now()}`;
		const ruleId = await seedOwnRule(page, name, 'v2');

		await gotoOverview(page, ruleId);
		await page.getByTestId('alert-actions-menu').click();

		const [createResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules$/.test(new URL(res.url()).pathname) &&
					res.request().method() === 'POST',
			),
			page.getByRole('menuitem', { name: 'Duplicate' }).click(),
		]);
		await registerCreatedRule(createResponse);

		// It lands on *an* overview page, but not reliably the clone's:
		// `useAlertRuleDuplicate` refetches the list and takes
		// `rules[rules.length - 1]`, and `GET /api/v1/rules` is not ordered by
		// creation — verified live landing back on the original. Assert what is
		// actually guaranteed: the copy exists and the app navigated to an overview.
		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(/[?&]ruleId=/);

		await page.goto(`${ALERTS_LIST_PATH}?search=${name}`);
		await expect(page.getByText(`${name} - Copy`)).toBeVisible();
	});

	test('AD-08 Delete returns to the list', async ({ authedPage: page }) => {
		const name = `e2e-ad-delete-${Date.now()}`;
		const ruleId = await seedOwnRule(page, name, 'v2');

		await gotoOverview(page, ruleId);
		await page.getByTestId('alert-actions-menu').click();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'DELETE',
			),
			page.getByRole('menuitem', { name: 'Delete' }).click(),
		]);
		ownedRuleIds.delete(ruleId);

		await expect(page).toHaveURL(new RegExp(`${ALERTS_LIST_PATH}$`));
		await page.goto(`${ALERTS_LIST_PATH}?search=${name}`);
		await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	});

	test('AD-09 copy-link button copies the current URL', async ({
		authedPage: page,
		alertHistory,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'clipboard-read permission is Chromium-only in Playwright',
		);
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		await gotoAlertHistory(page, alertHistory.ruleId);
		const expected = page.url();

		await page.getByRole('button', { name: 'Copy link' }).click();
		await expect(page.getByText('Copied')).toBeVisible();

		const copied = await page.evaluate(() => navigator.clipboard.readText());
		expect(copied).toBe(expected);
	});

	test('AD-10 breadcrumb navigates back to the list', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const breadcrumb = page.locator('.ant-breadcrumb');
		await expect(breadcrumb).toContainText('Alert Rules');
		await expect(breadcrumb).toContainText(alertHistory.ruleId);

		await breadcrumb.getByText('Alert Rules').click();

		await expect(page).toHaveURL(new RegExp(`${ALERTS_LIST_PATH}$`));
	});

	test('AD-11 invalid ruleId renders AlertNotFound', async ({
		authedPage: page,
	}) => {
		// A non-uuid-v7 id 400s on the rule lookup; a well-formed-but-missing one
		// 404s. Both land on AlertNotFound, so the history APIs are never called.
		await page.goto(`${ALERT_HISTORY_PATH}?ruleId=not-a-real-rule-id`);
		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();

		await page.goto(
			`${ALERT_HISTORY_PATH}?ruleId=01920000-0000-7000-8000-000000000000`,
		);
		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();
	});

	test('AD-12 missing ruleId on overview', async ({ authedPage: page }) => {
		// `AlertDetails` short-circuits on `!isValidRuleId` and renders
		// AlertNotFound before `EditRules` (which would toast + redirect) ever
		// mounts, so the observable behaviour is the not-found page.
		await page.goto(ALERT_OVERVIEW_PATH);

		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();
	});

	test('AD-13 document title becomes the rule name', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect
			.poll(() => page.title(), { timeout: 15_000 })
			.toContain('e2e-ah-rule-v2');
	});
});
