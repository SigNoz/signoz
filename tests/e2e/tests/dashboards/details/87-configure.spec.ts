import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import { authToken } from '../../../helpers/dashboards';
import {
	createDashboardV2ViaApi,
	dashboardV2Path,
	deleteDashboardV2ViaApi,
	getDashboardV2,
	readVariableSelection,
	variablePill,
	variablesBar,
	WIDE_VIEWPORT,
} from '../../../helpers/dashboards-v2';
import variablesFixture from '../../../testdata/variables-dashboard-v2.json';

// Defining variables in dashboard settings: the list, the form, and what reaches the
// runtime bar. Each test seeds its own dashboard, so a create or delete in one cannot
// affect another and the file runs in parallel.

test.use({ viewport: WIDE_VIEWPORT });

const seedIds = new Set<string>();

/** Seed a dashboard carrying the shared variable fixture, and open it. */
async function seedAndOpen(page: Page, label: string): Promise<string> {
	const id = await createDashboardV2ViaApi(
		page,
		`detail-configure-${label}-${process.env.TEST_WORKER_INDEX ?? '0'}`,
		variablesFixture.spec,
	);
	seedIds.add(id);
	await page.goto(dashboardV2Path(id));
	await expect(variablesBar(page)).toBeVisible();
	return id;
}

/**
 * Open the variables list. "Add variable" in the bar lands on the blank form, whose
 * "All variables" back-link is the list — one click fewer than going through the
 * settings drawer, and it does not depend on the drawer's tab layout.
 */
async function openVariablesList(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Add variable' }).click();
	await page.getByTestId('variable-form-back').click();
	await expect(page.getByTestId('variables-list')).toBeVisible();
}

/** Open the blank variable form straight from the bar. */
async function openNewVariableForm(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Add variable' }).click();
	await expect(page.getByTestId('variable-name')).toBeVisible();
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

test.describe('Dashboard settings — variables', () => {
	test('TC-01 the list shows every variable the dashboard defines', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'list');
		await openVariablesList(page);

		for (const name of ['tb_env', 'cu_service', 'cu_region']) {
			await expect(page.getByTestId(`variable-row-${name}`)).toBeVisible();
		}
	});

	test('TC-02 a new custom variable reaches the runtime bar', async ({
		authedPage: page,
	}) => {
		const id = await seedAndOpen(page, 'create');
		await openNewVariableForm(page);

		await page.getByTestId('variable-name').fill('cu_tier');
		await page.getByTestId('variable-type-custom').click();
		await page.getByTestId('variable-custom-input').fill('gold,silver');
		await page.getByTestId('variable-save').click();

		// Persisted in the spec, and rendered by the bar.
		await expect
			.poll(async () => {
				const stored = await getDashboardV2(page, id);
				return (stored.spec.variables as { spec: { name: string } }[]).map(
					(variable) => variable.spec.name,
				);
			})
			.toContain('cu_tier');
		await expect(variablePill(page, 'cu_tier')).toBeVisible();
	});

	test('TC-03 a duplicate name cannot be saved', async ({
		authedPage: page,
	}) => {
		const id = await seedAndOpen(page, 'dupe');
		await openNewVariableForm(page);

		await page.getByTestId('variable-name').fill('cu_service');
		await page.getByTestId('variable-type-custom').click();
		await page.getByTestId('variable-custom-input').fill('a,b');

		const save = page.getByTestId('variable-save');
		if (await save.isEnabled()) {
			await save.click();
		}

		// However it is refused, the dashboard must not end up with two `cu_service`.
		const names = (
			(await getDashboardV2(page, id)).spec.variables as {
				spec: { name: string };
			}[]
		).map((variable) => variable.spec.name);
		expect(names.filter((name) => name === 'cu_service')).toHaveLength(1);
	});

	test('TC-04 an empty name cannot be saved', async ({ authedPage: page }) => {
		await seedAndOpen(page, 'noname');
		await openNewVariableForm(page);

		await page.getByTestId('variable-type-custom').click();
		await page.getByTestId('variable-custom-input').fill('a,b');

		await expect(page.getByTestId('variable-save')).toBeDisabled();
	});

	test('TC-05 editing a custom variable changes the options it offers', async ({
		authedPage: page,
	}) => {
		const id = await seedAndOpen(page, 'edit');
		await openVariablesList(page);

		await page.getByTestId('variable-edit-cu_region').click();
		await page.getByTestId('variable-custom-input').fill('ap-south');
		await page.getByTestId('variable-save').click();

		await expect
			.poll(async () =>
				JSON.stringify((await getDashboardV2(page, id)).spec.variables),
			)
			.toContain('ap-south');
	});

	test('TC-06 deleting a variable takes it off the list and out of the bar', async ({
		authedPage: page,
	}) => {
		const id = await seedAndOpen(page, 'delete');
		await openVariablesList(page);

		await page.getByTestId('variable-delete-cu_region').click();
		await page.getByTestId('variable-delete-confirm-cu_region').click();

		await expect(page.getByTestId('variable-row-cu_region')).toBeHidden();
		// The row goes optimistically; wait for the write before reloading, or the
		// reload can race it and legitimately still show the variable.
		await expect
			.poll(async () =>
				(
					(await getDashboardV2(page, id)).spec.variables as {
						spec: { name: string };
					}[]
				).map((variable) => variable.spec.name),
			)
			.not.toContain('cu_region');

		await page.reload();
		await expect(variablesBar(page)).toBeVisible();
		await expect(variablePill(page, 'cu_region')).toBeHidden();
	});

	test('TC-07 a variable saved as single-select does not render as ALL', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'single');
		await openNewVariableForm(page);

		await page.getByTestId('variable-name').fill('cu_single_tier');
		await page.getByTestId('variable-type-custom').click();
		await page.getByTestId('variable-custom-input').fill('gold,silver');
		// ALL is only offered to a multi-select, so assert the switch state rather than
		// assuming the form's default.
		await expect(page.getByTestId('variable-multi-switch')).not.toBeChecked();
		await page.getByTestId('variable-save').click();

		await expect(variablePill(page, 'cu_single_tier')).toBeVisible();
		await expect
			.poll(() => readVariableSelection(page, 'cu_single_tier'))
			.not.toBe('ALL');
	});

	test('TC-08 discarding the form leaves the dashboard untouched', async ({
		authedPage: page,
	}) => {
		const id = await seedAndOpen(page, 'discard');
		const before = JSON.stringify(
			(await getDashboardV2(page, id)).spec.variables,
		);

		await openNewVariableForm(page);
		await page.getByTestId('variable-name').fill('cu_discarded');
		await page.getByTestId('variable-type-custom').click();
		await page.getByTestId('variable-custom-input').fill('x,y');
		await page.getByRole('button', { name: 'Discard' }).click();

		const after = JSON.stringify((await getDashboardV2(page, id)).spec.variables);
		expect(after).toBe(before);
		await expect(variablePill(page, 'cu_discarded')).toBeHidden();
	});
});
