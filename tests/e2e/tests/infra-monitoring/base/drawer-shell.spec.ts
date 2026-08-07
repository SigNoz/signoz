/**
 * B-DRW — `K8sBaseDetails`: the drawer shell. Identity in the URL, the metadata
 * row, the tab bar, and closing.
 *
 * The metadata labels and tab set are read straight from the registry, so a
 * "tidy-up" that renames `Statefulset Name` to `StatefulSet Name`, or reorders
 * the tabs, has to update the registry to go green.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	expectDrawerTabs,
	expectedTabViews,
	expectMetadataLabels,
	expectUrlParams,
} from '../../../helpers/infra-monitoring/assertions';
import {
	closeDrawer,
	drawer,
	expectDrawerVisible,
	DRAWER,
	drawerTab,
	expectedViewParam,
	openRowDrawer,
	readClipboardViaPaste,
	selectedItemParams,
	switchDrawerTab,
	TAB_EXPRESSION_PARAMS,
	viewFromUrl,
} from '../../../helpers/infra-monitoring/drawer';
import {
	fanOut,
	WIDE_TAG,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	listUrl,
	resetTableState,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

/** Seed, open the entity's list, and click its sample row's drawer open. */
async function openSampleDrawer(page: Page, entity: EntityDef): Promise<void> {
	await resetTableState(page, entity);
	const seeded = await seedDataset(page, entity.seed.primary);
	await gotoScopedList(page, entity, seeded.names);
	await waitForRow(page, entity.seed.sampleItemKey);
	await openRowDrawer(page, entity.seed.sampleItemKey);
}

/** A cold deep link straight to the drawer, no clicking. */
async function gotoDrawerDeepLink(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary);
	await page.goto(
		listUrl(entity, { ...selectedItemParams(entity), ...overrides }),
	);
}

// ─── all-level: metadata labels and the tab set are per-entity tables ─────────

for (const entity of fanOut('all')) {
	test.describe(`B-DRW ${entity.key} ${WIDE_TAG}`, () => {
		test(`B-DRW-01 ${entity.key}: a row click opens the drawer and writes its identity`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);

			await expectDrawerVisible(page);
			// The drawer title shows the *name*; for pods that differs from the
			// `selectedItem` UID, which is why both come from the registry.
			await expect(drawer(page)).toContainText(entity.seed.sampleName);
			await expectUrlParams(page, selectedItemParams(entity));
		});

		test(`B-DRW-02 ${entity.key}: metadata labels match the registry verbatim`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);
			await expectMetadataLabels(page, entity);
		});

		test(`B-DRW-07 ${entity.key}: the tab bar holds exactly ${expectedTabViews(entity).join(' · ') || 'no tabs'}`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);
			await expectDrawerTabs(page, entity);
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`B-DRW ${entity.key}`, () => {
		test(`B-DRW-03 ${entity.key}: copy-id copies selectedItem and toasts`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);

			await page.getByTestId(DRAWER.copyId).click();

			await expect(page.getByText('ID copied to clipboard')).toBeVisible();
			// Pods copy the UID, not the visible name.
			expect(await readClipboardViaPaste(page)).toBe(entity.seed.sampleItemKey);
		});

		test(`B-DRW-04 ${entity.key}: the close button and Escape both clear the identity params`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);
			await closeDrawer(page);

			await expectUrlParams(page, {
				selectedItem: null,
				selectedItemClusterName: null,
				selectedItemNamespaceName: null,
			});

			// Escape closes it too.
			await openRowDrawer(page, entity.seed.sampleItemKey);
			await page.keyboard.press('Escape');
			await expectUrlParams(page, { selectedItem: null });
		});

		test(`B-DRW-05 ${entity.key}: a cold deep link opens the drawer without a click`, async ({
			authedPage: page,
		}) => {
			await gotoDrawerDeepLink(page, entity);

			await expectDrawerVisible(page);
			await expect(drawer(page)).toContainText(entity.seed.sampleName);
		});

		test(`B-DRW-06 ${entity.key}: a nonexistent selectedItem opens a dash-titled drawer, not a blank page`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary);
			await page.goto(
				listUrl(entity, {
					...selectedItemParams(entity),
					selectedItem: 'no-such-entity-anywhere-xyz',
				}),
			);

			await expectDrawerVisible(page);
			// "Failed to load entity details" needs an *error*; a 200 with zero records
			// is a success, so the title falls through to `'-'`. The drawer offering a
			// dash and empty panels for a nonexistent id is a product gap worth
			// recording — but it is the shipped behaviour, so that is what is pinned.
			await expect(drawer(page).getByText('-', { exact: true })).toBeVisible();
			await expect(drawer(page)).not.toContainText(entity.seed.sampleName);
		});

		test(`B-DRW-10 ${entity.key}: auto-refresh is hidden while the drawer is open`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);

			// `showAutoRefresh={!selectedItem}` hides the *list's* control, but
			// `EntityDateTimeSelector` passes `showAutoRefresh` unconditionally, so the
			// drawer brings its own. Counting page-wide against the drawer's own count
			// pins "the list's is gone" without needing a not-inside-the-drawer selector.
			const autoRefresh = page.getByRole('button', { name: /auto refresh/i });
			const drawerAutoRefresh = drawer(page).getByRole('button', {
				name: /auto refresh/i,
			});
			await expect(drawerAutoRefresh).toHaveCount(1);
			await expect(autoRefresh).toHaveCount(1);

			await closeDrawer(page);
			await waitForRows(page);
			// With the drawer gone the only one left is the list's.
			await expect(autoRefresh).toHaveCount(1);
			await expect(autoRefresh.first()).toBeVisible();
		});

		test(`B-DRW-11 ${entity.key}: back closes the drawer and forward reopens it`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);

			await page.goBack();
			await expectUrlParams(page, { selectedItem: null });
			await expect(page.getByTestId(DRAWER.close)).toHaveCount(0);

			await page.goForward();
			await expectUrlParams(page, {
				selectedItem: entity.seed.sampleItemKey,
			});
			await expectDrawerVisible(page);
		});

		test(`B-DRW-12 ${entity.key}: closing and reopening keeps the metadata`, async ({
			authedPage: page,
		}) => {
			await openSampleDrawer(page, entity);
			await expectMetadataLabels(page, entity);

			await closeDrawer(page);
			await waitForRows(page);
			await openRowDrawer(page, entity.seed.sampleItemKey);

			// Exactly one drawer, with its metadata intact.
			await expect(page.getByTestId(DRAWER.wrapper)).toHaveCount(1);
			await expectMetadataLabels(page, entity);
		});
	});
}

// ─── tab-bar behaviour, on the entities that have a tab bar ──────────────────

for (const entity of fanOut('representative', 'tabBar')) {
	test.describe(`B-DRW tabs ${entity.key}`, () => {
		test(`B-DRW-08 ${entity.key}: an invalid view coerces to the first valid tab`, async ({
			authedPage: page,
		}) => {
			await gotoDrawerDeepLink(page, entity, { view: 'not-a-tab' });

			await expectDrawerVisible(page);
			const first = expectedTabViews(entity)[0];
			// The correction lands as a *removal*: `view` defaults to `metrics` with
			// `clearOnDefault`, so coercing an out-of-scope value back to the first tab
			// deletes the param rather than rewriting it.
			await expect(async () => {
				expect(viewFromUrl(page)).toBe(expectedViewParam(first));
			}).toPass();
			await expect(drawerTab(page, first)).toHaveAttribute('data-state', 'on');
		});

		test(`B-DRW-09 ${entity.key}: switching tabs writes view and clears the per-tab expressions`, async ({
			authedPage: page,
		}) => {
			const views = expectedTabViews(entity);
			test.skip(views.length < 2, `${entity.key} has a single tab`);

			// Land with all three per-tab expression params set, then switch.
			const preset = Object.fromEntries(
				TAB_EXPRESSION_PARAMS.map((param) => [param, '"stale"']),
			);
			await gotoDrawerDeepLink(page, entity, preset);
			await expectDrawerVisible(page);

			await switchDrawerTab(page, views[1]);

			await expectUrlParams(page, {
				view: views[1],
				...Object.fromEntries(TAB_EXPRESSION_PARAMS.map((p) => [p, null])),
			});
		});
	});
}
