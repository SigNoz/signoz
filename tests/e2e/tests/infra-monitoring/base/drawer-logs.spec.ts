/**
 * B-LOG — the drawer's Logs tab, on the entities whose config enables it.
 *
 * The tab is always scoped to the entity: `getInitialLogTracesExpression`
 * produces a filter the user cannot edit away, and anything they type is
 * combined with it rather than replacing it.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	EXPLORER_LINK,
	SCOPE_CHIP,
	TAB_USER_EXPRESSION_PARAM,
	emptyState,
	entityRunQueryButton,
	errorState,
	expectDrawerVisible,
	runEntityQuery,
	selectedItemParams,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import {
	fanOut,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	allowForSeededWait,
	listUrl,
	resetTableState,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

/** The param the logs tab keeps the *user's* half of the expression in. */
const LOGS_EXPRESSION_PARAM = TAB_USER_EXPRESSION_PARAM.logs;

async function openLogsTab(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary);
	await page.goto(
		listUrl(entity, {
			...selectedItemParams(entity),
			view: 'logs',
			...overrides,
		}),
	);
	await expectDrawerVisible(page);
}

for (const entity of fanOut('representative', 'logsTab')) {
	test.describe(`B-LOG ${entity.key}`, () => {
		test(`B-LOG-01 ${entity.key}: the tab loads pre-filtered by the entity's identity`, async ({
			authedPage: page,
		}) => {
			await openLogsTab(page, entity);

			// The initial expression is rendered as a non-editable scope chip rather
			// than as text in the editor (`isScopedFilter` in `QuerySearch`).
			await expect(page.locator(SCOPE_CHIP)).toBeVisible();
		});

		test(`B-LOG-02 ${entity.key}: no matching logs renders the empty state`, async ({
			authedPage: page,
		}) => {
			await openLogsTab(page, entity);

			// Nothing was seeded for logs, so the tab has nothing to show.
			await expect(emptyState(page)).toBeVisible();
			await expect(emptyState(page)).toHaveAttribute('data-has-filters', 'false');
		});

		test(`B-LOG-03 ${entity.key}: a user expression is kept in the URL and survives a reload`, async ({
			authedPage: page,
		}) => {
			const expression = "severity_text = 'ERROR'";
			await openLogsTab(page, entity, {
				[LOGS_EXPRESSION_PARAM]: expression,
			});

			await expect(async () => {
				expect(new URL(page.url()).searchParams.get(LOGS_EXPRESSION_PARAM)).toBe(
					expression,
				);
			}).toPass();

			await page.reload();
			await expectDrawerVisible(page);
			expect(new URL(page.url()).searchParams.get(LOGS_EXPRESSION_PARAM)).toBe(
				expression,
			);
			// With a user filter, the empty state switches to its "has filters" copy.
			await expect(emptyState(page)).toHaveAttribute('data-has-filters', 'true');
		});

		test(`B-LOG-06 ${entity.key}: the compass opens the logs explorer in a new tab`, async ({
			authedPage: page,
		}) => {
			await openLogsTab(page, entity);

			const compass = page.getByTestId(EXPLORER_LINK.logs);
			await expect(compass).toBeVisible();

			const [opened] = await Promise.all([
				page.context().waitForEvent('page'),
				compass.click(),
			]);
			await opened.waitForLoadState();

			expect(opened.url()).toContain('/logs/logs-explorer');
			// The scope travels with it.
			expect(opened.url()).toContain('compositeQuery');
			await opened.close();
		});

		test(`B-LOG-07 ${entity.key}: a list error renders the error state`, async ({
			authedPage: page,
		}) => {
			// Same budget problem as B-TRC-07: the drawer wait can consume the default
			// timeout on its own before the error state is even asserted.
			allowForSeededWait();
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary);

			await page.route(/\/api\/v\d+\/query_range/, async (route) => {
				const body = route.request().postData() ?? '';
				// Only the logs query, so the drawer itself still loads.
				if (body.includes('"logs"')) {
					await route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({ status: 'error', error: 'logs exploded' }),
					});
					return;
				}
				await route.continue();
			});

			await page.goto(
				listUrl(entity, { ...selectedItemParams(entity), view: 'logs' }),
			);

			await expectDrawerVisible(page);
			await expect(errorState(page)).toBeVisible();
			await page.unrouteAll();
		});

		test(`B-LOG-05 ${entity.key}: Run refetches without discarding the entity scope`, async ({
			authedPage: page,
		}) => {
			await openLogsTab(page, entity);

			// Wait for the tab *body* before arming the listener. `openLogsTab` returns
			// once the drawer shell is up, which is before the tab's own initial
			// `query_range` fires — so that request landed in the counter while the Run
			// button was still mounting, and `length > before` was satisfied by page
			// load. Deleting the `runEntityQuery` call below left the test green.
			await expect(page.locator(SCOPE_CHIP)).toBeVisible({ timeout: 30_000 });
			await expect(entityRunQueryButton(page, 'logs')).toBeVisible();

			// Tie the assertion to the click: wait for a request that starts *after*
			// it, rather than counting ones that may predate it.
			const refetch = page.waitForRequest(
				(request) => /query_range/.test(request.url()),
				{ timeout: 15_000 },
			);
			await runEntityQuery(page, 'logs');
			await refetch;
			// The scope chip is still there — Run cannot edit it away.
			await expect(page.locator(SCOPE_CHIP)).toBeVisible();
		});

		test(`B-LOG-04 ${entity.key}: switching away from Logs drops logFilters but keeps the expression`, async ({
			authedPage: page,
		}) => {
			await openLogsTab(page, entity, {
				[LOGS_EXPRESSION_PARAM]: "severity_text = 'ERROR'",
				logFilters: JSON.stringify({ items: [], op: 'AND' }),
			});

			await switchDrawerTab(page, 'metrics');

			// `handleTabChange` nulls the three `*Filters` params and nothing else, so
			// the user's typed expression survives the round trip. Whether it *should*
			// is a product question; this pins the behaviour that ships.
			await expect(async () => {
				expect(new URL(page.url()).searchParams.get('logFilters')).toBeNull();
			}).toPass();
			expect(new URL(page.url()).searchParams.get(LOGS_EXPRESSION_PARAM)).toBe(
				"severity_text = 'ERROR'",
			);
		});
	});
}
