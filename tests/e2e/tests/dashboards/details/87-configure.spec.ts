import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	awaitVariablesResolved,
	createDashboardViaApi,
	deleteDashboardViaApi,
} from '../../../helpers/dashboards';

const TELEMETRY_DEPENDENT_VARS = ['q_env', 'q_service', 'd_namespace'];

// `createVariablesDashboardViaApi` is added by the group-3 spec. Import lazily
// so this file still compiles while it is missing — tests that need it skip
// at runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dashboardsHelpers = require('../../../helpers/dashboards') as {
	createVariablesDashboardViaApi?: (
		page: Page,
		title: string,
	) => Promise<string>;
};
const hasVariablesHelper =
	typeof dashboardsHelpers.createVariablesDashboardViaApi === 'function';

test.describe.configure({ mode: 'serial' });

const seedIds = new Set<string>();

async function seed(page: Page, title: string): Promise<string> {
	const id = await createDashboardViaApi(page, title);
	seedIds.add(id);
	return id;
}

async function seedVariablesDashboard(
	page: Page,
	title: string,
): Promise<string> {
	if (!dashboardsHelpers.createVariablesDashboardViaApi) {
		throw new Error('createVariablesDashboardViaApi helper is not available');
	}
	const id = await dashboardsHelpers.createVariablesDashboardViaApi(page, title);
	seedIds.add(id);
	// Wait for the seeded dashboard's variables to fully resolve before any
	// caller test acts on them. Variables with defaults already have
	// `selectedValue` set; Query/Dynamic variables can't resolve without
	// telemetry and are skipped.
	await awaitVariablesResolved(page, id, {
		skipNames: TELEMETRY_DEPENDENT_VARS,
	});
	return id;
}

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

async function openConfigureDrawer(page: Page) {
	// An empty dashboard renders an onboarding canvas with a duplicate
	// `data-testid="show-drawer"` Configure CTA alongside the toolbar one.
	// Scope to the toolbar (`.dashboard-details .right-section`) to avoid the
	// strict-mode collision.
	await page
		.locator('.dashboard-details .right-section')
		.getByTestId('show-drawer')
		.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

async function deleteVariableByName(page: Page, varName: string) {
	const dialog = await openConfigureDrawer(page);
	await dialog.getByRole('tab', { name: 'Variables' }).click();
	const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
	const nameCell = tabpanel.getByText(varName, { exact: true }).first();
	await nameCell.hover();
	// Walk up to the surrounding row container to scope the delete-button
	// search; `.variable-item` (or the variable row container) wraps the
	// hover-revealed delete button.
	await nameCell
		.locator('xpath=ancestor::*[contains(@class,"variable-item") or self::tr][1]')
		.locator('.delete-variable-button')
		.first()
		.dispatchEvent('click');
	const confirm = page
		.getByRole('dialog')
		.filter({ hasText: /delete variable/i })
		.last();
	await confirm.getByRole('button', { name: 'OK' }).click();
	await expect(tabpanel.getByText(varName, { exact: true })).toHaveCount(0);
	await dialog.getByRole('button', { name: /close/i }).first().click();
}

test.describe('Dashboard Detail — Configure drawer', () => {
	test('TC-01 Configure drawer opens with three tabs and Overview is active', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'cfg-drawer-chrome');
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);

		await expect(dialog.getByText('Dashboard Configuration')).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'Overview' })).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'Variables' })).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'Publish' })).toBeVisible();

		await expect(dialog.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await expect(
			dialog.getByRole('tabpanel', { name: 'Overview' }),
		).toBeVisible();

		await dialog.getByRole('button', { name: /close/i }).first().click();
		await expect(dialog).not.toBeVisible();
	});

	test('TC-02 update name, description, and tag — persists across reload', async ({
		authedPage: page,
	}) => {
		const ts = Date.now();
		const original = `cfg-overview-save-${ts}`;
		const updated = `Configured-${ts}`;
		const id = await seed(page, original);
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);

		const nameInput = dialog.getByTestId('dashboard-name');
		await nameInput.click();
		await nameInput.fill('');
		await nameInput.fill(updated);

		await dialog.getByTestId('dashboard-desc').fill('Automated test description');

		const tagInput = dialog.getByPlaceholder('Start typing your tag name');
		await tagInput.fill(`e2e-tag-${ts}`);
		await tagInput.press('Enter');

		const saveBtn = dialog.getByRole('button', { name: 'Save' });
		await saveBtn.scrollIntoViewIfNeeded();
		const [putResp] = await Promise.all([
			page.waitForResponse(
				(r) => r.request().method() === 'PUT' && /\/dashboards\//.test(r.url()),
			),
			saveBtn.click({ force: true }),
		]);
		expect(putResp.ok()).toBeTruthy();

		await dialog.getByRole('button', { name: /close/i }).first().click();
		await page.reload();
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${updated}`),
			}),
		).toBeVisible();
	});

	test('TC-03 Discard reverts unsaved Overview changes', async ({
		authedPage: page,
	}) => {
		const original = 'cfg-overview-discard';
		const id = await seed(page, original);
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);
		const nameInput = dialog.getByTestId('dashboard-name');
		await expect(nameInput).toHaveValue(original);

		await nameInput.fill('Temp Modified Name');
		const discard = dialog.getByRole('button', { name: 'Discard' });
		await expect(discard).toBeVisible();
		await discard.click();

		await expect(nameInput).toHaveValue(original);
		await expect(dialog.getByRole('button', { name: 'Save' })).not.toBeVisible();

		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	test('TC-04 Variables tab lists existing variables', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not yet available (lands with group 3)',
		);

		const id = await seedVariablesDashboard(page, 'cfg-variables-list');
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
		await expect(tabpanel).toBeVisible();

		for (const varName of [
			'tb_env',
			'tb_service',
			'cu_env_all',
			'cu_services',
			'q_env',
			'q_service',
			'd_namespace',
		]) {
			// Variable rows render as plain text inside the Variables tab
			// (not a true Antd `Table` with role="row"). Locate via text.
			await expect(
				tabpanel.getByText(varName, { exact: true }).first(),
			).toBeVisible();
		}

		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	test('TC-05 add a Textbox variable — appears in the variables bar and is interactive', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not yet available (lands with group 3)',
		);

		const id = await seedVariablesDashboard(page, 'cfg-variables-add-textbox');
		await page.goto(`/dashboard/${id}`);

		const ts = Date.now();
		const varName = `tb_var_${ts}`;

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		await dialog.getByTestId('add-new-variable').click();

		await dialog.getByPlaceholder('Unique name of the variable').fill(varName);
		await dialog.getByRole('button', { name: 'Textbox' }).click();

		const saveBtn = dialog.getByRole('button', { name: 'Save Variable' });
		await expect(saveBtn).toBeEnabled();
		await saveBtn.click({ force: true });

		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
		await expect(
			tabpanel.getByText(varName, { exact: true }).first(),
		).toBeVisible();
		await dialog.getByRole('button', { name: /close/i }).first().click();
		await expect(dialog).not.toBeVisible();

		await expect(page.getByText(`$${varName}`)).toBeVisible();

		const newTextbox = page.locator('input[placeholder="Enter value"]').last();
		await newTextbox.fill('test-value');
		await newTextbox.press('Enter');
		await expect(page).toHaveURL(/test-value/);

		await deleteVariableByName(page, varName);
	});

	test('TC-06 add a Custom variable — appears in the list', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not yet available (lands with group 3)',
		);

		const id = await seedVariablesDashboard(page, 'cfg-variables-add-custom');
		await page.goto(`/dashboard/${id}`);

		const ts = Date.now();
		const varName = `custom_var_${ts}`;

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		await dialog.getByTestId('add-new-variable').click();

		await dialog.getByPlaceholder('Unique name of the variable').fill(varName);
		await dialog.getByRole('button', { name: 'Custom' }).click();

		await dialog
			.getByRole('button', { name: 'Save Variable' })
			.click({ force: true });

		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
		await expect(
			tabpanel.getByText(varName, { exact: true }).first(),
		).toBeVisible();
		await dialog.getByRole('button', { name: /close/i }).first().click();

		await deleteVariableByName(page, varName);
	});

	// known limitation: TC-07 (add a Dynamic (Beta) variable) is intentionally
	// not implemented. Dynamic variables source from the SigNoz attribute
	// index — the bootstrap stack ingests no telemetry, so the field selector
	// renders an empty option list and Save Variable can never be enabled.
	// Re-add once the bootstrap seeds telemetry attributes.

	test('TC-08 selecting Query type renders the query editor', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not yet available (lands with group 3)',
		);

		const id = await seedVariablesDashboard(page, 'cfg-variables-add-query');
		await page.goto(`/dashboard/${id}`);

		const ts = Date.now();
		const varName = `query_var_${ts}`;

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		await dialog.getByTestId('add-new-variable').click();

		await dialog.getByPlaceholder('Unique name of the variable').fill(varName);
		await dialog.getByRole('button', { name: /Query/ }).click();

		// Monaco is lazy-loaded — its bundle chunk can take several seconds to
		// arrive under parallel-worker CI load, far longer than the default 5 s
		// locator timeout. 20 s is comfortable headroom without masking real
		// regressions.
		await expect(dialog.locator('.monaco-editor').first()).toBeVisible({
			timeout: 20_000,
		});

		await dialog.getByRole('button', { name: 'Discard' }).click();
		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	test('TC-09 Save Variable disabled when name is empty', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'cfg-variables-empty-name');
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		await dialog.getByTestId('add-new-variable').click();

		const nameField = dialog.getByPlaceholder('Unique name of the variable');
		await expect(nameField).toHaveValue('');
		await expect(
			dialog.getByRole('button', { name: 'Save Variable' }),
		).toBeDisabled();

		await dialog.getByRole('button', { name: 'Discard' }).click();
		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	test('TC-10 Publish tab shows private message and Publish button', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'cfg-publish');
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Publish' }).click();
		await expect(dialog.getByRole('tabpanel', { name: 'Publish' })).toBeVisible();

		await expect(
			dialog.getByText(
				'This dashboard is private. Publish it to make it accessible to anyone with the link.',
			),
		).toBeVisible();
		await expect(
			dialog.getByRole('checkbox', { name: 'Enable time range' }),
		).toBeVisible();
		await expect(
			dialog.getByText("Dashboard variables won't work in public dashboards"),
		).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: 'Publish dashboard' }),
		).toBeVisible();

		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	// ─── TBD coverage — placeholders to fill in when each feature lands ──────
	//
	// `test.skip` placeholders for behaviours not yet covered. Replace with
	// `test` and implement when the corresponding feature ships or the seed
	// gains the necessary state.

	test('TC-11 edit existing variable — rename', async ({ authedPage: page }) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not available',
		);

		const id = await seedVariablesDashboard(page, 'cfg-rename-variable');
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByText('$tb_env', { exact: true })).toBeVisible();

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });

		// Hover the row to reveal the edit button (Pylon overlay can intercept,
		// so dispatchEvent fires the click directly on the React onClick).
		const nameCell = tabpanel.getByText('tb_env', { exact: true }).first();
		await nameCell.hover();
		await nameCell
			.locator(
				'xpath=ancestor::*[contains(@class,"variable-item") or self::tr][1]',
			)
			.locator('.edit-variable-button')
			.first()
			.dispatchEvent('click');

		// Editor form mounts; rename and save.
		const renamed = `tb_env_renamed_${Date.now()}`;
		const nameInput = dialog.getByPlaceholder('Unique name of the variable');
		await expect(nameInput).toHaveValue('tb_env');
		await nameInput.fill(renamed);
		await dialog
			.getByRole('button', { name: 'Save Variable' })
			.click({ force: true });

		// Variables bar reflects the rename; the original label is gone.
		await dialog.getByRole('button', { name: /close/i }).first().click();
		await expect(page.getByText(`$${renamed}`, { exact: true })).toBeVisible();
		await expect(page.getByText('$tb_env', { exact: true })).toHaveCount(0);
	});

	test('TC-12 edit existing variable — change type (CUSTOM → QUERY)', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not available',
		);

		const id = await seedVariablesDashboard(page, 'cfg-change-type');
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
		const nameCell = tabpanel.getByText('cu_single', { exact: true }).first();
		await nameCell.hover();
		await nameCell
			.locator(
				'xpath=ancestor::*[contains(@class,"variable-item") or self::tr][1]',
			)
			.locator('.edit-variable-button')
			.first()
			.dispatchEvent('click');

		// Change type from Custom to Query and verify the form swaps to the
		// Query editor (Monaco SQL editor mounts where the comma-separated
		// values input used to live).
		await dialog.getByRole('button', { name: /Query/ }).click();
		// Monaco is lazy-loaded — its bundle chunk can take several seconds to
		// arrive under parallel-worker CI load, far longer than the default 5 s
		// locator timeout. 20 s is comfortable headroom without masking real
		// regressions.
		await expect(dialog.locator('.monaco-editor').first()).toBeVisible({
			timeout: 20_000,
		});

		// The previous Custom-specific fields must no longer be visible.
		await expect(dialog.getByPlaceholder(/Comma separated values/i)).toHaveCount(
			0,
		);

		// Discard rather than save — saving without filling the new query
		// would leave a half-configured Query variable. The contract this TC
		// guards is "type switching swaps the form correctly", which the
		// assertions above already prove.
		await dialog.getByRole('button', { name: 'Discard' }).click();
		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	test('TC-13 edit existing variable — change default textbox value persists across reload', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not available',
		);

		const id = await seedVariablesDashboard(page, 'cfg-change-default');
		await page.goto(`/dashboard/${id}`);
		await expect(page.locator('input[value="otel-demo"]')).toBeVisible();

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
		const nameCell = tabpanel.getByText('tb_env', { exact: true }).first();
		await nameCell.hover();
		await nameCell
			.locator(
				'xpath=ancestor::*[contains(@class,"variable-item") or self::tr][1]',
			)
			.locator('.edit-variable-button')
			.first()
			.dispatchEvent('click');

		// Update the default textbox value. The Default Value input is the
		// second/third field (Name first); locate it via its placeholder.
		const defaultInput = dialog
			.getByPlaceholder(/Enter default value|Default value/i)
			.first();
		await defaultInput.fill('new-default');

		// PUT confirms the variable persisted server-side before we close +
		// reload. Without this wait the reload races the save and the old
		// "otel-demo" default renders, producing the observed flake.
		const putResponse = page.waitForResponse(
			(r) => r.request().method() === 'PUT' && /\/dashboards\//.test(r.url()),
		);
		await dialog
			.getByRole('button', { name: 'Save Variable' })
			.click({ force: true });
		await putResponse;

		// Reload — the new default renders without URL state because it's
		// now the persisted seed value.
		await dialog.getByRole('button', { name: /close/i }).first().click();
		await page.reload();
		await expect(page.locator('input[value="new-default"]')).toBeVisible();
	});

	test('TC-14 delete variable — removed from variables bar', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not available',
		);

		const id = await seedVariablesDashboard(page, 'cfg-delete-variable');
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByText('$tb_env', { exact: true })).toBeVisible();

		// Reuse the existing helper and assert the variables bar reflects
		// the deletion — `deleteVariableByName` covers the Configure-side
		// removal; the bar update is the new contract this TC adds.
		await deleteVariableByName(page, 'tb_env');
		await expect(page.getByText('$tb_env', { exact: true })).toHaveCount(0);
		// Sibling textbox is unaffected.
		await expect(page.getByText('$tb_service', { exact: true })).toBeVisible();
	});

	test('TC-15 variable name validation — duplicate name keeps Save disabled', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not available',
		);

		const id = await seedVariablesDashboard(page, 'cfg-validate-duplicate');
		await page.goto(`/dashboard/${id}`);

		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		await dialog.getByTestId('add-new-variable').click();

		await dialog.getByPlaceholder('Unique name of the variable').fill('tb_env');
		await dialog.getByRole('button', { name: 'Textbox' }).click();

		// Save Variable should refuse to enable while the name collides with
		// an existing variable. Assert the button stays disabled, OR a
		// validation message surfaces — UI may pick either signal.
		const saveBtn = dialog.getByRole('button', { name: 'Save Variable' });
		const errorMsg = dialog.getByText(/already exists|duplicate|in use/i);

		// Either Save is disabled, or an explicit error is shown — both are
		// valid contracts. `Promise.race` between the two assertions tolerates
		// whichever the UI provides.
		await expect
			.poll(async () => {
				const disabled = await saveBtn.isDisabled().catch(() => false);
				const err = await errorMsg.isVisible().catch(() => false);
				return disabled || err;
			})
			.toBeTruthy();

		await dialog.getByRole('button', { name: 'Discard' }).click();
		await dialog.getByRole('button', { name: /close/i }).first().click();
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-16 variable name validation — invalid characters / whitespace', async () => {
		// Names containing spaces, $-prefix, dots, etc. should be rejected
		// by the validator. Confirm Save Variable stays disabled with an
		// inline error message.
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-17 reorder variables via drag persists `order` in JSON', async () => {
		// The Variables tab supports drag handles. After a reorder, the
		// persisted `data.variables[*].order` reflects the new sequence and
		// the variables bar re-renders accordingly.
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-18 add a Dynamic (Beta) variable via Configure → pick seeded attribute', async () => {
		// Dynamic-variable resolution itself is covered by
		// `67-variables` TC-15 (seed metric → Dynamic dropdown lists the
		// namespace → URL state updates). What this TC adds is the Configure
		// drawer's *Add Variable → Dynamic* form, whose attribute-picker
		// uses a combobox whose stable locator hasn't been pinned in this
		// suite yet — leave skipped pending a snapshot pass.
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-19 Variable description renders in tooltip / inline metadata', async () => {
		// `description` field on each variable should be surfaced in the
		// variables bar tooltip and in the Variables tab's row.
	});

	// eslint-disable-next-line playwright/expect-expect
	test.skip('TC-20 Save Variable disabled while query is in flight', async () => {
		// For a Query variable mid-resolution, Save Variable should be
		// disabled until the query returns options. Otherwise we'd save
		// a variable with an empty option list.
	});

	test('TC-21 cancel-mid-edit variable changes are not persisted', async ({
		authedPage: page,
	}) => {
		test.skip(
			!hasVariablesHelper,
			'createVariablesDashboardViaApi helper not available',
		);

		const id = await seedVariablesDashboard(page, 'cfg-cancel-edit-variable');
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByText('$tb_env', { exact: true })).toBeVisible();

		// Open the editor for tb_env and dirty the Name field.
		const dialog = await openConfigureDrawer(page);
		await dialog.getByRole('tab', { name: 'Variables' }).click();
		const tabpanel = dialog.getByRole('tabpanel', { name: 'Variables' });
		const nameCell = tabpanel.getByText('tb_env', { exact: true }).first();
		await nameCell.hover();
		await nameCell
			.locator(
				'xpath=ancestor::*[contains(@class,"variable-item") or self::tr][1]',
			)
			.locator('.edit-variable-button')
			.first()
			.dispatchEvent('click');

		const nameInput = dialog.getByPlaceholder('Unique name of the variable');
		await expect(nameInput).toHaveValue('tb_env');
		await nameInput.fill('SHOULD_NOT_PERSIST');

		// Discard, then re-open the same row. The Name must still be the
		// original — abandoned edits never reach the persisted JSON.
		await dialog.getByRole('button', { name: 'Discard' }).click();
		await dialog.getByRole('button', { name: /close/i }).first().click();
		await expect(page.getByText('$tb_env', { exact: true })).toBeVisible();
		await expect(
			page.getByText('$SHOULD_NOT_PERSIST', { exact: true }),
		).toHaveCount(0);

		// Reopen Configure → tb_env still has the original name.
		const dialog2 = await openConfigureDrawer(page);
		await dialog2.getByRole('tab', { name: 'Variables' }).click();
		await expect(
			dialog2
				.getByRole('tabpanel', { name: 'Variables' })
				.getByText('tb_env', { exact: true })
				.first(),
		).toBeVisible();
	});
});
