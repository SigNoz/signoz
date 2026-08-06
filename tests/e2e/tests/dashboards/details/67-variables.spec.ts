import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import { authToken } from '../../../helpers/dashboards';
import {
	anyDropdown,
	closeVariableDropdown,
	readCheckedOptions,
	createDashboardV2ViaApi,
	dashboardV2Path,
	deleteDashboardV2ViaApi,
	hiddenVariablesTooltip,
	openVariableDropdown,
	optionRow,
	pickVariableValues,
	readVariableSelection,
	variableControl,
	variablePill,
	variablesBar,
	variableTextInput,
	WIDE_VIEWPORT,
} from '../../../helpers/dashboards-v2';
import variablesFixture from '../../../testdata/variables-dashboard-v2.json';

// The runtime variables bar on the V2 detail page. Everything here is driven from
// text + custom variables, whose option lists come from the definition — so no
// assertion depends on telemetry the stack may or may not hold.
//
// Fetched variables (QUERY / DYNAMIC) and the behaviours that only they can show —
// a selection surviving a time-range refetch, a typed value surviving a cascade —
// need seeded telemetry and are covered separately.

test.use({ viewport: WIDE_VIEWPORT });

const seedIds = new Set<string>();
let dashboardId = '';

// Each worker seeds its own dashboard: the v2 API rejects a duplicate name, and
// `beforeAll` runs once per worker.
const SUITE_TITLE = `detail-variables-suite-${process.env.TEST_WORKER_INDEX ?? '0'}`;

async function open(page: Page): Promise<void> {
	await page.goto(dashboardV2Path(dashboardId));
	await expect(variablesBar(page)).toBeVisible();
}

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		dashboardId = await createDashboardV2ViaApi(
			page,
			SUITE_TITLE,
			variablesFixture.spec,
		);
		seedIds.add(dashboardId);
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
			await deleteDashboardV2ViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboard detail — variables bar', () => {
	test('TC-01 every seeded variable renders as a pill labelled with its name', async ({
		authedPage: page,
	}) => {
		await open(page);

		for (const name of ['tb_env', 'cu_service', 'cu_region']) {
			await expect(variablePill(page, name)).toBeVisible();
			await expect(variablePill(page, name)).toContainText(`$${name}`);
		}
	});

	test('TC-02 an ALL-enabled multi-select with no default resolves to ALL', async ({
		authedPage: page,
	}) => {
		await open(page);

		await expect
			.poll(() => readVariableSelection(page, 'cu_service'))
			.toBe('ALL');
	});

	test('TC-03 a single-select renders its configured default', async ({
		authedPage: page,
	}) => {
		await open(page);

		await expect
			.poll(() => readVariableSelection(page, 'cu_region'))
			.toContain('eu-west');
	});

	test('TC-04 "Only" on a row collapses an ALL selection to that one value', async ({
		authedPage: page,
	}) => {
		await open(page);

		await pickVariableValues(page, 'cu_service', ['payments']);

		const shown = await readVariableSelection(page, 'cu_service');
		expect(shown).toContain('payments');
		expect(shown).not.toContain('checkout');
	});

	test('TC-05 checking a second value adds it to the selection', async ({
		authedPage: page,
	}) => {
		await open(page);

		await pickVariableValues(page, 'cu_service', ['payments', 'cart']);

		// Read from the open list: the closed control shows one tag plus a "+N", so it
		// cannot tell a two-value selection from a one-value one.
		expect(await readCheckedOptions(page, 'cu_service')).toEqual(
			expect.arrayContaining(['payments', 'cart']),
		);
	});

	test('TC-06 a multi-select edit is committed by closing the dropdown, not per toggle', async ({
		authedPage: page,
	}) => {
		await open(page);
		await pickVariableValues(page, 'cu_service', ['checkout']);

		// Toggle a second value on, and read the closed control's committed text BEFORE
		// closing: it must still show only what was committed on the previous close.
		await openVariableDropdown(page, 'cu_service');
		await optionRow(page, 'cart').click();
		await expect(anyDropdown(page).first()).toBeVisible();

		await closeVariableDropdown(page);
		expect(await readCheckedOptions(page, 'cu_service')).toEqual(
			expect.arrayContaining(['checkout', 'cart']),
		);
	});

	test('TC-07 a selection survives a reload', async ({ authedPage: page }) => {
		await open(page);
		await pickVariableValues(page, 'cu_service', ['cart']);

		await page.reload();
		await expect(variablesBar(page)).toBeVisible();

		await expect
			.poll(() => readVariableSelection(page, 'cu_service'))
			.toContain('cart');
	});

	test('TC-08 a text variable keeps a typed value across a reload', async ({
		authedPage: page,
	}) => {
		await open(page);

		const input = variableTextInput(page, 'tb_env');
		await input.fill('staging');
		await input.blur();

		await page.reload();
		await expect(variableTextInput(page, 'tb_env')).toHaveValue('staging');
	});

	test('TC-09 switching a single-select replaces its value', async ({
		authedPage: page,
	}) => {
		await open(page);

		await variableControl(page, 'cu_region').click();
		await optionRow(page, 'us-east').click();

		await expect
			.poll(() => readVariableSelection(page, 'cu_region'))
			.toContain('us-east');
	});

	test('TC-10 variables that do not fit collapse into a "+N" overflow', async ({
		authedPage: page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await open(page);

		const overflow = page.getByRole('button', { name: /^\+\d+$/ });
		await expect(overflow).toBeVisible();

		await overflow.hover();
		await expect(hiddenVariablesTooltip(page)).toBeVisible();
	});
});
