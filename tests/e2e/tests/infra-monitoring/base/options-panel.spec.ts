/**
 * B-OPT — `K8sOptionsSidePanel`: column visibility, font size and line clamp.
 *
 * Two persistence scopes matter and are deliberately different:
 * column state is per entity (`@signoz/table-columns/k8s-<entity>-columns`) while
 * font size and line clamp are **global**
 * (`@signoz/infra-monitoring-table-preferences`) — B-OPT-07 asserts that leak on
 * purpose.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { expectDefaultColumns } from '../../../helpers/infra-monitoring/assertions';
import {
	entityByKey,
	fanOut,
	hiddenByDefaultColumns,
	optionsPanelColumns,
	WIDE_TAG,
	type EntityColumn,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	LINE_CLAMP,
	columnStorageKey,
	columnToggle,
	dataRows,
	fontSizeOption,
	gotoList,
	headerCell,
	openOptionsPanel,
	readColumnState,
	readTablePreferences,
	resetTableState,
	toggleColumn,
	visibleColumnHeaders,
	waitForRows,
	writeColumnState,
	writeRawColumnState,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

async function openSeededList(page: Page, entity: EntityDef): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary);
	await gotoList(page, entity);
	await waitForRows(page);
}

/**
 * The first column a user could actually hide.
 *
 * Named rather than positional. `pods.columns[2].id` silently retargeted these
 * scenarios at a different column the moment anyone inserted one into the
 * registry, and read as an arbitrary constant.
 */
function firstToggleableColumn(entity: EntityDef): EntityColumn {
	const column = optionsPanelColumns(entity).find(
		(candidate) => !candidate.required && !candidate.hiddenByDefault,
	);
	if (!column) {
		throw new Error(`${entity.key} has no hideable default-visible column`);
	}
	return column;
}

// ─── all-level: expected values come from the registry's column matrix ────────

for (const entity of fanOut('all')) {
	test.describe(`B-OPT ${entity.key} ${WIDE_TAG}`, () => {
		test(`B-OPT-02 ${entity.key}: toggling a column off hides it and persists`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			const hideable = optionsPanelColumns(entity).find(
				(column) => !column.required && !column.hiddenByDefault,
			);
			expect(
				hideable,
				'entity has a hideable default-visible column',
			).toBeDefined();

			await openOptionsPanel(page);
			await toggleColumn(page, hideable!.id, false);

			await expect(headerCell(page, hideable!.id)).toHaveCount(0);
			await expect(async () => {
				const stored = await readColumnState(page, columnStorageKey(entity));
				expect(stored.hiddenColumnIds ?? []).toContain(hideable!.id);
			}).toPass();

			await page.reload();
			await waitForRows(page);
			await expect(headerCell(page, hideable!.id)).toHaveCount(0);
		});

		test(`B-OPT-03 ${entity.key}: toggling a hidden-by-default column on shows it and persists`, async ({
			authedPage: page,
		}) => {
			const hidden = hiddenByDefaultColumns(entity);
			test.skip(
				hidden.length === 0,
				`${entity.key} has no hidden-by-default column`,
			);

			await openSeededList(page, entity);
			const column = hidden[0];

			await expect(headerCell(page, column.id)).toHaveCount(0);
			await openOptionsPanel(page);
			await toggleColumn(page, column.id, true);
			await expect(headerCell(page, column.id)).toHaveCount(1);

			await page.reload();
			await waitForRows(page);
			await expect(headerCell(page, column.id)).toHaveCount(1);
			expect(await visibleColumnHeaders(page)).toContain(column.header);
		});

		test(`B-OPT-04 ${entity.key}: required columns' switches are disabled`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await openOptionsPanel(page);

			const required = optionsPanelColumns(entity).filter(
				(column) => column.required,
			);
			expect(required.length, 'entity has a required column').toBeGreaterThan(0);

			for (const column of required) {
				await expect(columnToggle(page, column.id)).toBeDisabled();
			}

			// The tooltip lives on the wrapper the disabled switch sits inside. The
			// columns list scrolls, so a required switch can sit below the panel's fold —
			// `hover` then fails with "outside of the viewport" even with `force`.
			await columnToggle(page, required[0].id).scrollIntoViewIfNeeded();
			await columnToggle(page, required[0].id).hover({ force: true });
			await expect(
				page.getByText('Required column cannot be hidden'),
			).toBeVisible();
		});

		test(`B-OPT-05 ${entity.key}: the panel omits hidden-on-collapse columns`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await openOptionsPanel(page);

			// The group column is `hidden-on-collapse` and must not be listed.
			await expect(columnToggle(page, entity.groupColumnId)).toHaveCount(0);
			for (const column of optionsPanelColumns(entity)) {
				await expect(columnToggle(page, column.id)).toHaveCount(1);
			}
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`B-OPT ${entity.key}`, () => {
		test(`B-OPT-01 ${entity.key}: the Options drawer opens and closes`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			const panel = await openOptionsPanel(page);

			await panel.getByRole('button', { name: /close/i }).first().click();
			await expect(panel).toBeHidden();
		});

		test(`B-OPT-06 ${entity.key}: panel order follows the persisted columnOrder`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			// Reverse the persisted order, then check the panel reflects it.
			const ids = optionsPanelColumns(entity).map((column) => column.id);
			await writeColumnState(page, columnStorageKey(entity), {
				columnOrder: [...ids].reverse(),
			});
			await page.reload();
			await waitForRows(page);
			await openOptionsPanel(page);

			const rendered = await page
				.locator('[data-testid^="toggle-column-"]')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							node.getAttribute('data-testid')?.replace('toggle-column-', '') ?? '',
					),
				);
			// Completeness first: filtering the expectation by the observation (which
			// `.filter((id) => rendered.includes(id))` does on its own) means a panel
			// that silently *drops* columns still matches.
			expect(rendered.length, 'the panel lists every toggleable column').toBe(
				ids.length,
			);
			expect(rendered).toEqual([...ids].reverse());
		});

		test(`B-OPT-09 ${entity.key}: clearing the column key restores the registry defaults`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			const hideable = optionsPanelColumns(entity).find(
				(column) => !column.required && !column.hiddenByDefault,
			);
			await openOptionsPanel(page);
			await toggleColumn(page, hideable!.id, false);
			await expect(headerCell(page, hideable!.id)).toHaveCount(0);

			await page.evaluate(
				(key) => localStorage.removeItem(key),
				columnStorageKey(entity),
			);
			await page.reload();
			await waitForRows(page);

			await expectDefaultColumns(page, entity);
		});
	});
}

// ─── once-level: global state, no per-entity input ───────────────────────────

test.describe('B-OPT global preferences', () => {
	const pods = entityByKey('pods');
	const nodes = entityByKey('nodes');

	test('B-OPT-07 font size persists globally across entities', async ({
		authedPage: page,
	}) => {
		await openSeededList(page, pods);
		await openOptionsPanel(page);

		const large = fontSizeOption(page, 'large');
		await large.click();
		// The active option shows a check mark.
		await expect(large.locator('svg')).toHaveCount(1);
		await expect(async () => {
			expect((await readTablePreferences(page)).fontSize).toBe('large');
		}).toPass();

		// The key is global, not per entity — assert the leak deliberately.
		await seedDataset(page, nodes.seed.primary);
		await gotoList(page, nodes);
		await waitForRows(page);
		await openOptionsPanel(page);
		await expect(fontSizeOption(page, 'large').locator('svg')).toHaveCount(1);
		expect((await readTablePreferences(page)).fontSize).toBe('large');
	});

	test('B-OPT-08 line clamp clamps to 1..10, disables at the bounds and persists', async ({
		authedPage: page,
	}) => {
		await openSeededList(page, pods);
		await openOptionsPanel(page);

		const input = page.getByTestId(LINE_CLAMP.input);
		const increase = page.getByTestId(LINE_CLAMP.increase);
		const decrease = page.getByTestId(LINE_CLAMP.decrease);

		await increase.click();
		await expect(async () => {
			expect((await readTablePreferences(page)).lineClamp).toBe(2);
		}).toPass();

		await decrease.click();
		await expect(async () => {
			expect((await readTablePreferences(page)).lineClamp).toBe(1);
		}).toPass();
		// Lower bound.
		await expect(decrease).toBeDisabled();

		await input.fill('10');
		await expect(async () => {
			expect((await readTablePreferences(page)).lineClamp).toBe(10);
		}).toPass();
		// Upper bound.
		await expect(increase).toBeDisabled();

		// A typed out-of-range value clamps rather than being accepted.
		//
		// `toBe(10)`, not `toBeLessThanOrEqual(10)`. The stored value is *already* 10
		// from the fill above, and `setLineClamp` silently ignores out-of-range input
		// — so the loose bound passed even if `fill('42')` had done nothing at all,
		// which is precisely the regression it is supposed to catch.
		await input.fill('42');
		await expect(async () => {
			expect((await readTablePreferences(page)).lineClamp).toBe(10);
		}).toPass();
		// The controlled input snaps back too, which is what a user sees.
		await expect(input).toHaveValue('10');

		await page.reload();
		await waitForRows(page);
		expect((await readTablePreferences(page)).lineClamp).toBe(10);

		// The plan's remaining half: the *rendered* rows pick the clamp up. Store
		// state alone says nothing about whether the table ever consumed it.
		await expect(async () => {
			// The clamp lands on the cell's text span (`.tableCellText`), which is where
			// `--tanstack-plain-body-line-clamp` is consumed; the `td` itself never
			// carries it and always computes to `none`.
			const clamp = await dataRows(page)
				.first()
				.locator('[class*="tableCellText"]')
				.first()
				.evaluate((cell) => getComputedStyle(cell).webkitLineClamp);
			expect(clamp).toBe('10');
		}).toPass();
	});

	test('B-OPT-11 a partial persisted column state does not take the route down', async ({
		authedPage: page,
	}) => {
		await openSeededList(page, pods);

		// A value missing `columnOrder`/`columnSizing` — an older schema, or a write
		// that lost a key. The selectors read the in-memory table's fields directly,
		// so before `loadTableFromStorage` normalised them this rendered the
		// "Something went wrong :/" boundary instead of a table.
		await writeRawColumnState(
			page,
			columnStorageKey(pods),
			JSON.stringify({ hiddenColumnIds: [firstToggleableColumn(pods).id] }),
		);
		await page.reload();

		await waitForRows(page);
		await expect(page.getByText('Something went wrong')).toHaveCount(0);
		await expect(headerCell(page, pods.nameColumnId)).toBeVisible();
	});

	test('B-OPT-10 a bogus hiddenColumnIds entry is pruned on load', async ({
		authedPage: page,
	}) => {
		await openSeededList(page, pods);

		await writeColumnState(page, columnStorageKey(pods), {
			hiddenColumnIds: [
				'this-column-does-not-exist',
				firstToggleableColumn(pods).id,
			],
		});
		await page.reload();
		await waitForRows(page);

		await expect(async () => {
			const stored = await readColumnState(page, columnStorageKey(pods));
			expect(stored.hiddenColumnIds ?? []).not.toContain(
				'this-column-does-not-exist',
			);
			// A real id is kept — pruning is targeted, not a reset.
			expect(stored.hiddenColumnIds ?? []).toContain(
				firstToggleableColumn(pods).id,
			);
		}).toPass();
	});
});
