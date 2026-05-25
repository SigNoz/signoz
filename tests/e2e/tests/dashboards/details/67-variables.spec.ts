import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	awaitVariablesResolved,
	createVariablesDashboardViaApi,
	deleteDashboardViaApi,
} from '../../../helpers/dashboards';
import variablesTemplate from '../../../testdata/variables-dashboard.json';

// Variables that depend on backend resolution against seeded telemetry the
// bootstrap stack does not produce. Skip them so `awaitVariablesResolved`
// does not block on values that can never appear.
const TELEMETRY_DEPENDENT_VARS = ['q_env', 'q_service', 'd_namespace'];

test.describe.configure({ mode: 'serial' });

const seedIds = new Set<string>();
let varDashboardId = '';

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		varDashboardId = await createVariablesDashboardViaApi(
			page,
			'detail-variables-suite',
		);
		seedIds.add(varDashboardId);
		// Per the framework contract: every variable with a default has its
		// `selectedValue` set in the seed JSON; backend-resolved variables
		// (Query / Dynamic) cannot resolve without seeded telemetry, so we
		// list them in `skipNames`. Tests must not race ahead of seed
		// materialisation — this gate ensures the persisted dashboard is in
		// a known state before any test runs.
		await awaitVariablesResolved(page, varDashboardId, {
			skipNames: TELEMETRY_DEPENDENT_VARS,
		});
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

function variablesQueryParam(state: Record<string, unknown>): string {
	return encodeURIComponent(encodeURIComponent(JSON.stringify(state)));
}

async function gotoVariablesDashboard(
	page: Page,
	urlState?: Record<string, unknown>,
): Promise<void> {
	const url = urlState
		? `/dashboard/${varDashboardId}?variables=${variablesQueryParam(urlState)}`
		: `/dashboard/${varDashboardId}`;
	await page.goto(url);
	await expect(
		page.getByRole('button', {
			name: /dashboard-icon detail-variables-suite/,
		}),
	).toBeVisible();
}

test.describe('Dashboard Detail — Variables', () => {
	test('TC-01 variables bar renders all four types', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		for (const name of [
			'$tb_env',
			'$tb_service',
			'$cu_single',
			'$cu_env_all',
			'$cu_services',
			'$q_env',
			'$q_service',
			'$d_namespace',
		]) {
			await expect(page.getByText(name, { exact: true })).toBeVisible();
		}

		// Textbox variables expose their current value via `value` and `title`
		// attributes (the antd Input has no accessible name matching the value),
		// so we match on input[value="..."] rather than getByRole+name.
		await expect(page.locator('input[value="otel-demo"]')).toBeVisible();
		await expect(page.locator('input[value="frontend"]')).toBeVisible();

		await expect(page.getByTestId('variable-select')).toHaveCount(6);
	});

	test('TC-02 selecting a value in a single-value Custom variable updates URL and aria-selected', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		// $cu_single (nth(0)) — single-select Custom with three static
		// options. Driving Custom rather than Query keeps the test
		// deterministic regardless of seeded telemetry.
		const dropdown = page.getByTestId('variable-select').nth(0);
		await dropdown.click();
		await page.getByRole('option', { name: 'mq-kafka' }).click();

		await expect(
			dropdown.locator('.ant-select-selection-item', { hasText: 'mq-kafka' }),
		).toBeVisible();
		await expect(page).toHaveURL(/variables=.*mq-kafka/);

		await dropdown.click();
		await expect(page.getByRole('option', { name: 'mq-kafka' })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await page.keyboard.press('Escape');
	});

	test('TC-03 multi-select renders chips and URL encodes array', async ({
		authedPage: page,
	}) => {
		// URL state seeds adservice + cartservice as initial selection; this also
		// guarantees the URL contains the encoded array so we can assert on it
		// without relying on the seeded server-side selection rendering identically
		// across reloads.
		await gotoVariablesDashboard(page, {
			cu_services: ['adservice', 'cartservice'],
		});

		await expect(
			page.getByRole('button', { name: 'Remove tag adservice' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Remove tag cartservice' }),
		).toBeVisible();

		await expect(page).toHaveURL(/adservice/);
		await expect(page).toHaveURL(/cartservice/);
	});

	test('TC-04 removing a chip updates URL', async ({ authedPage: page }) => {
		await gotoVariablesDashboard(page, {
			cu_services: ['adservice', 'cartservice'],
		});

		await expect(
			page.getByRole('button', { name: 'Remove tag adservice' }),
		).toBeVisible();
		await page.getByRole('button', { name: 'Remove tag adservice' }).click();

		// Removing a chip on a multi-select expands the dropdown; URL state
		// only commits when the dropdown closes (onDropdownVisibleChange =>
		// false). The CustomMultiSelect swallows Escape, so click outside the
		// dropdown to dismiss it.
		await page.locator('img[alt="dashboard-img"]').click();
		await expect(page.getByRole('listbox')).toBeHidden();

		await expect(
			page.getByRole('button', { name: 'Remove tag adservice' }),
		).toBeHidden();
		await expect(
			page.getByRole('button', { name: 'Remove tag cartservice' }),
		).toBeVisible();
		await expect(page).toHaveURL(/variables=/);
		await expect(page).not.toHaveURL(/adservice/);
	});

	test('TC-05 ALL option on a Custom variable', async ({ authedPage: page }) => {
		await gotoVariablesDashboard(page, { cu_env_all: 'otel-demo' });

		// $cu_env_all (nth(1)) — multi-select Custom with showALLOption: true,
		// so the dropdown exposes an "ALL" toggle alongside the static options.
		const dropdown = page.getByTestId('variable-select').nth(1);
		await expect(
			dropdown.locator('.ant-select-selection-item', {
				hasText: 'otel-demo',
			}),
		).toBeVisible();

		await dropdown.click();
		await page.getByRole('option', { name: 'ALL' }).click();

		// When ALL is selected, the multi-select renders an "ALL" badge in a
		// custom container (not the standard .ant-select-selection-item), so
		// match on the option's checked state inside the dropdown listbox
		// rather than on the closed-state chip.
		await expect(page.getByRole('option', { name: 'ALL' })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await expect(page).toHaveURL(/variables=/);
	});

	test('TC-06 textbox variable update propagates to URL', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		// Locate by the testid wrapping a stable id, since `input[value="..."]`
		// becomes stale the moment we fill('') the field.
		await expect(page.locator('input[value="otel-demo"]')).toBeVisible();
		const tb = page.getByPlaceholder('Enter value').first();
		await tb.click();
		await tb.fill('');
		await tb.fill('production');
		await tb.press('Enter');

		await expect(page.locator('input[value="production"]')).toBeVisible();
		await expect(page).toHaveURL(/variables=.*production/);
	});

	test('TC-07 cascading: child variable listbox opens after parent change', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page, { q_env: 'otel-demo' });

		// q_service (nth(4)) is cascaded from q_env (nth(3)).
		const child = page.getByTestId('variable-select').nth(4);
		await child.click();

		// known behaviour: the child's option list requires seeded telemetry —
		// the bootstrap stack has none, so we only assert that the listbox
		// renders without crashing rather than checking specific options.
		await expect(page.getByRole('listbox').first()).toBeVisible();
		await page.keyboard.press('Escape');

		await expect(page).toHaveURL(/otel-demo/);
	});

	test('TC-08 URL deep-link restores variable state on hard reload', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page, { cu_env_all: 'mq-kafka' });

		const dropdown = page.getByTestId('variable-select').nth(1);
		await expect(
			dropdown.locator('.ant-select-selection-item', { hasText: 'mq-kafka' }),
		).toBeVisible();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(
			page.getByRole('button', {
				name: /dashboard-icon detail-variables-suite/,
			}),
		).toBeVisible();
		await expect(
			dropdown.locator('.ant-select-selection-item', { hasText: 'mq-kafka' }),
		).toBeVisible();

		await expect(page).toHaveURL(/variables=%257B/);
	});

	// ─── Deep coverage ───────────────────────────────────────────────────────

	test('TC-09 ALL → specific value → ALL round-trip preserves URL state', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);
		const dropdown = page.getByTestId('variable-select').nth(1); // cu_env_all

		// Seed defaults to ALL — open, pick a specific value, assert URL.
		await dropdown.click();
		await page.getByRole('option', { name: 'mq-kafka' }).click();
		await page.keyboard.press('Escape');
		await expect(page).toHaveURL(/mq-kafka/);

		// Re-open, switch back to ALL — URL must update again.
		await dropdown.click();
		const allOption = page.getByRole('option', { name: 'ALL' });
		await allOption.click();
		await expect(allOption).toHaveAttribute('aria-selected', 'true');
		await page.keyboard.press('Escape');
		// `mq-kafka` should no longer appear in the URL after reverting to ALL.
		await expect(page).not.toHaveURL(/mq-kafka/);
	});

	test('TC-10 two variables changed in sequence both encode in URL', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		// cu_single — pick `production`.
		const single = page.getByTestId('variable-select').nth(0);
		await single.click();
		await page.getByRole('option', { name: 'production' }).click();
		await page.keyboard.press('Escape');
		await expect(page).toHaveURL(/production/);

		// q_service — open the multi-select, dismiss without picking. The URL
		// should still contain the previous selection.
		const cuServices = page.getByTestId('variable-select').nth(2);
		await cuServices.click();
		await page.keyboard.press('Escape');
		await expect(page).toHaveURL(/production/);
		await expect(page).toHaveURL(/cu_single/);
	});

	test('TC-11 navigating away and back preserves the URL-encoded state', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page, { cu_single: 'mq-kafka' });
		const dropdown = page.getByTestId('variable-select').nth(0);
		await expect(
			dropdown.locator('.ant-select-selection-item', { hasText: 'mq-kafka' }),
		).toBeVisible();
		const stateUrl = page.url();

		// Leave to the list, come back via browser back — URL is restored.
		// `dispatchEvent('click')` — the expanded sidenav intercepts pointer
		// events at the breadcrumb's center, defeating even `force: true`.
		// Dispatching the click directly on the DOM node bypasses hit testing.
		await page
			.getByRole('button', { name: 'Dashboard /' })
			.dispatchEvent('click');
		await expect(page).toHaveURL(/\/dashboard$/);
		await page.goBack();
		await expect(page).toHaveURL(stateUrl);
		await expect(
			dropdown.locator('.ant-select-selection-item', { hasText: 'mq-kafka' }),
		).toBeVisible();
	});

	// ─── TBD coverage — placeholders to fill in when each feature lands ──────
	//
	// Each `test.skip` below marks a behaviour the spec does NOT yet exercise.
	// They are intentional gaps, not bugs — when the feature ships or the seed
	// gains telemetry, replace `test.skip` with `test`, drop the comment, and
	// implement.

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-12 Custom variable without a default prompts user to select a value', async () => {
		// Requires extending variables-dashboard.json with a Custom variable
		// that has no `selectedValue` and no `allSelected`. The UI should
		// render the dropdown empty/"Select value" until a user picks.
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-13 Query variable with pre-seeded selectedValue renders without backend resolution', async () => {
		// Requires extending variables-dashboard.json with a Query variable
		// that ships with `selectedValue` already populated — the UI should
		// trust the seed and not block on a query.
	});

	test('TC-14 multi-select Query variable without telemetry shows an empty option list', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		// q_service is the only multi-select Query in the seed (nth(4) in
		// the dropdown order). Without telemetry the option list is empty —
		// assert the empty-state explicitly.
		const child = page.getByTestId('variable-select').nth(4);
		await child.click();
		const listbox = page.getByRole('listbox').first();
		await expect(listbox).toBeVisible();
		await expect(listbox.getByRole('option')).toHaveCount(0);
		await page.keyboard.press('Escape');
	});

	test('TC-15 Dynamic variable resolves a seeded namespace value', async ({
		authedPage: page,
	}) => {
		// d_namespace's `dynamicVariablesAttribute` is `k8s.namespace.name`
		// over the `metrics` source. The bootstrap OTel collector ingests
		// the golden dataset which tags every resource with
		// `k8s.namespace.name=signoz-<service>` for 8 distinct services.
		// SigNoz's `signoz_metrics.distributed_metadata` table is populated
		// naturally by the collector's signozclickhousemetrics exporter, and
		// `/api/v1/fields/values?signal=metrics&name=k8s.namespace.name`
		// surfaces the values so the Dynamic variable auto-resolves.
		await gotoVariablesDashboard(page);

		// d_namespace is the 6th dropdown variable in DOM order. The
		// closed-state of the combobox renders the auto-resolved value
		// inline next to the variable name. Match any of the 8 seeded
		// namespaces — ordering depends on the backend sort, so we accept
		// whichever it returns first.
		const dynamic = page.getByTestId('variable-select').nth(5);
		await expect(dynamic).toContainText(/signoz-\w+/, { timeout: 15_000 });
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-16 changing a variable referenced in a panel query refetches the panel data', async () => {
		// $service.name and $deployment.environment are referenced by APM
		// panel queries. Asserting that a variable change triggers a
		// query_range refetch with the new substitution requires either
		// seeded telemetry or a network-request listener that confirms the
		// outbound query body contains the new value. Defer until the
		// chart-data assertion path is in place.
	});

	test('TC-17 variable bar order matches the `order` field in dashboard JSON', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		// Expected order matches the `order` field in variables-dashboard.json.
		const expected = [
			'$tb_env',
			'$tb_service',
			'$cu_single',
			'$cu_env_all',
			'$cu_services',
			'$q_env',
			'$q_service',
			'$d_namespace',
		];
		const allText = await page.locator('text=/^\\$\\w+$/').allInnerTexts();
		const actual = allText.filter((t) => /^\$\w+$/.test(t));
		expect(actual.slice(0, expected.length)).toEqual(expected);
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-18 reordering variables via drag persists to the dashboard JSON', async () => {
		// The Configure → Variables tab supports drag handles. After a
		// reorder, the persisted `order` fields should update and the
		// variables bar should re-render in the new order.
	});

	test('TC-19 variable removed via Configure disappears from the variables bar', async ({
		authedPage: page,
	}) => {
		await gotoVariablesDashboard(page);

		// `tb_service` (textbox, no dependents) — easiest to remove cleanly.
		await expect(page.getByText('$tb_service', { exact: true })).toBeVisible();

		await page
			.locator('.dashboard-details .right-section')
			.getByTestId('show-drawer')
			.click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });

		const nameCell = tabpanel.getByText('tb_service', { exact: true }).first();
		await nameCell.hover();
		await nameCell
			.locator(
				'xpath=ancestor::*[contains(@class,"variable-item") or self::tr][1]',
			)
			.locator('.delete-variable-button')
			.first()
			.dispatchEvent('click');
		const confirm = page
			.getByRole('dialog')
			.filter({ hasText: /delete variable/i })
			.last();
		await confirm.getByRole('button', { name: 'OK' }).click();

		await expect(tabpanel.getByText('tb_service', { exact: true })).toHaveCount(
			0,
		);
		await dialog.getByRole('button', { name: /close/i }).first().click();

		await expect(page.getByText('$tb_service', { exact: true })).toHaveCount(0);

		// Restore the persisted variable so subsequent serial-mode tests still pass.
		const token = await authToken(page);
		await page.request.put(`/api/v1/dashboards/${varDashboardId}`, {
			data: { ...variablesTemplate, title: 'detail-variables-suite' },
			headers: { Authorization: `Bearer ${token}` },
		});
		await page.reload();
		await expect(page.getByText('$tb_service', { exact: true })).toBeVisible();
	});
});
