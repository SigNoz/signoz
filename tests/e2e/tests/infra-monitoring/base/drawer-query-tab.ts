/**
 * The contract the drawer's Logs and Traces tabs share.
 *
 * Both are the same product component with a different query source, and
 * scenarios 01 through 07 were byte-identical between the two spec files modulo
 * the tab name. They live here so the two specs carry only what is genuinely
 * theirs: `B-TRC-08` (pagination) and `B-TRC-09` (trace columns) have no logs
 * counterpart.
 *
 * Not a `.spec.ts`: Playwright's default `testMatch` would collect it directly
 * and declare every scenario twice.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	EXPLORER_LINK,
	SCOPE_CHIP,
	TAB_USER_EXPRESSION_PARAM,
	emptyState,
	expectEmptyState,
	entityRunQueryButton,
	errorState,
	expectDrawerVisible,
	runEntityQuery,
	selectedItemParams,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import {
	fanOut,
	type EntityCapability,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	allowForSeededWait,
	listUrl,
	resetTableState,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

export type QueryTab = 'logs' | 'traces';

export interface QueryTabOptions {
	tab: QueryTab;
	/** Scenario-id prefix, `B-LOG` or `B-TRC`. */
	tag: string;
	capability: EntityCapability;
	/** Any expression valid for the tab's signal; what it selects is irrelevant. */
	sampleExpression: string;
	/** Pathname the compass is expected to land on. */
	explorerPath: string;
	/** The `*Filters` param `handleTabChange` nulls for this tab. */
	filtersParam: string;
}

/**
 * Open `entity`'s drawer straight onto `tab`.
 *
 * Deep-linked rather than clicked: the tab is reachable from the URL and this
 * skips a drawer-shell interaction the tab specs do not assert.
 */
export async function openQueryTab(
	page: Page,
	entity: EntityDef,
	tab: QueryTab,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary);
	await page.goto(
		listUrl(entity, {
			...selectedItemParams(entity),
			view: tab,
			...overrides,
		}),
	);
	await expectDrawerVisible(page);
}

export function describeQueryTab(options: QueryTabOptions): void {
	const { tab, tag, capability, sampleExpression, explorerPath, filtersParam } =
		options;
	const expressionParam = TAB_USER_EXPRESSION_PARAM[tab];

	for (const entity of fanOut('representative', capability)) {
		test.describe(`${tag} ${entity.key}`, () => {
			test(`${tag}-01 ${entity.key}: the tab loads pre-filtered by the entity's identity`, async ({
				authedPage: page,
			}) => {
				await openQueryTab(page, entity, tab);

				// The initial expression is rendered as a non-editable scope chip rather
				// than as text in the editor (`isScopedFilter` in `QuerySearch`).
				await expect(page.locator(SCOPE_CHIP)).toBeVisible();
			});

			test(`${tag}-02 ${entity.key}: no matching ${tab} renders the empty state`, async ({
				authedPage: page,
			}) => {
				await openQueryTab(page, entity, tab);

				// `seed.ts` posts only `/telemetry/metrics`, so this signal has nothing
				// to show for any entity.
				await expect(emptyState(page)).toBeVisible();
				await expectEmptyState(page, false);
			});

			test(`${tag}-03 ${entity.key}: a user expression is kept in the URL and survives a reload`, async ({
				authedPage: page,
			}) => {
				await openQueryTab(page, entity, tab, {
					[expressionParam]: sampleExpression,
				});

				await expect(async () => {
					expect(new URL(page.url()).searchParams.get(expressionParam)).toBe(
						sampleExpression,
					);
				}).toPass();

				await page.reload();
				await expectDrawerVisible(page);
				expect(new URL(page.url()).searchParams.get(expressionParam)).toBe(
					sampleExpression,
				);
				// With a user filter, the empty state switches to its "has filters" copy.
				await expectEmptyState(page, true);
			});

			test(`${tag}-04 ${entity.key}: switching away drops ${filtersParam} but keeps the expression`, async ({
				authedPage: page,
			}) => {
				await openQueryTab(page, entity, tab, {
					[expressionParam]: sampleExpression,
					[filtersParam]: JSON.stringify({ items: [], op: 'AND' }),
				});

				await switchDrawerTab(page, 'metrics');

				// `handleTabChange` nulls the three `*Filters` params and nothing else, so
				// the user's typed expression survives the round trip. Whether it *should*
				// is a product question; this pins the behaviour that ships.
				await expect(async () => {
					expect(new URL(page.url()).searchParams.get(filtersParam)).toBeNull();
				}).toPass();
				expect(new URL(page.url()).searchParams.get(expressionParam)).toBe(
					sampleExpression,
				);
			});

			test(`${tag}-05 ${entity.key}: Run refetches without discarding the entity scope`, async ({
				authedPage: page,
			}) => {
				await openQueryTab(page, entity, tab);

				// Wait for the tab *body* before arming the listener. `openQueryTab`
				// returns once the drawer shell is up, which is before the tab's own
				// initial `query_range` fires — so that request landed in the counter
				// while the Run button was still mounting, and `length > before` was
				// satisfied by page load. Deleting the `runEntityQuery` call below left
				// the test green.
				await expect(page.locator(SCOPE_CHIP)).toBeVisible({ timeout: 30_000 });
				await expect(entityRunQueryButton(page, tab)).toBeVisible();

				// Tie the assertion to the click: wait for a request that starts *after*
				// it, rather than counting ones that may predate it.
				const refetch = page.waitForRequest(
					(request) => /query_range/.test(request.url()),
					{ timeout: 15_000 },
				);
				await runEntityQuery(page, tab);
				await refetch;
				// The scope chip is still there — Run cannot edit it away.
				await expect(page.locator(SCOPE_CHIP)).toBeVisible();
			});

			test(`${tag}-06 ${entity.key}: the compass opens the ${tab} explorer in a new tab`, async ({
				authedPage: page,
			}) => {
				await openQueryTab(page, entity, tab);

				const compass = page.getByTestId(EXPLORER_LINK[tab]);
				await expect(compass).toBeVisible();

				const [opened] = await Promise.all([
					page.context().waitForEvent('page'),
					compass.click(),
				]);
				await opened.waitForLoadState();

				expect(opened.url()).toContain(explorerPath);
				// The scope travels with it.
				expect(opened.url()).toContain('compositeQuery');
				await opened.close();
			});

			test(`${tag}-07 ${entity.key}: a list error renders the error state`, async ({
				authedPage: page,
			}) => {
				// `expectDrawerVisible` alone may spend the whole default budget on a cold
				// deep link (§11.1), and this scenario needs the error state on top of it.
				allowForSeededWait();
				await resetTableState(page, entity);
				await seedDataset(page, entity.seed.primary);

				await page.route(/\/api\/v\d+\/query_range/, async (route) => {
					const body = route.request().postData() ?? '';
					// Only this tab's query, so the drawer itself still loads.
					if (body.includes(`"${tab}"`)) {
						await route.fulfill({
							status: 500,
							contentType: 'application/json',
							body: JSON.stringify({ status: 'error', error: `${tab} exploded` }),
						});
						return;
					}
					await route.continue();
				});

				await page.goto(
					listUrl(entity, { ...selectedItemParams(entity), view: tab }),
				);

				await expectDrawerVisible(page);
				await expect(errorState(page)).toBeVisible();
				await page.unrouteAll();
			});
		});
	}
}
