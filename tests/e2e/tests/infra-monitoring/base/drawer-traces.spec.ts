/**
 * B-TRC — the drawer's Traces tab. Mirrors B-LOG with the traces expression key,
 * plus the `pagination` param the traces list drives paging with.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	expectDrawerVisible,
	emptyState,
	errorState,
	EXPLORER_LINK,
	PAGINATION_PARAM,
	paginationFromUrl,
	SCOPE_CHIP,
	runEntityQuery,
	selectedItemParams,
	switchDrawerTab,
	TAB_USER_EXPRESSION_PARAM,
} from '../../../helpers/infra-monitoring/drawer';
import {
	fanOut,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	listUrl,
	resetTableState,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const TRACES_EXPRESSION_PARAM = TAB_USER_EXPRESSION_PARAM.traces;

async function openTracesTab(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary as DatasetKey);
	await page.goto(
		listUrl(entity, {
			...selectedItemParams(entity),
			view: 'traces',
			...overrides,
		}),
	);
	await expectDrawerVisible(page);
}

for (const entity of fanOut('representative', 'tracesTab')) {
	test.describe(`B-TRC ${entity.key}`, () => {
		test(`B-TRC-01 ${entity.key}: the tab loads pre-filtered by the entity's identity`, async ({
			authedPage: page,
		}) => {
			await openTracesTab(page, entity);
			await expect(page.locator(SCOPE_CHIP)).toBeVisible();
		});

		test(`B-TRC-02 ${entity.key}: no matching traces renders the empty state`, async ({
			authedPage: page,
		}) => {
			await openTracesTab(page, entity);
			await expect(emptyState(page)).toBeVisible();
			await expect(emptyState(page)).toHaveAttribute('data-has-filters', 'false');
		});

		test(`B-TRC-03 ${entity.key}: a user expression is kept in the URL and survives a reload`, async ({
			authedPage: page,
		}) => {
			const expression = "name = 'GET /health'";
			await openTracesTab(page, entity, {
				[TRACES_EXPRESSION_PARAM]: expression,
			});

			await expect(async () => {
				expect(new URL(page.url()).searchParams.get(TRACES_EXPRESSION_PARAM)).toBe(
					expression,
				);
			}).toPass();

			await page.reload();
			await expectDrawerVisible(page);
			expect(new URL(page.url()).searchParams.get(TRACES_EXPRESSION_PARAM)).toBe(
				expression,
			);
			await expect(emptyState(page)).toHaveAttribute('data-has-filters', 'true');
		});

		test(`B-TRC-06 ${entity.key}: the compass opens the traces explorer in a new tab`, async ({
			authedPage: page,
		}) => {
			await openTracesTab(page, entity);

			const compass = page.getByTestId(EXPLORER_LINK.traces);
			await expect(compass).toBeVisible();

			const [opened] = await Promise.all([
				page.context().waitForEvent('page'),
				compass.click(),
			]);
			await opened.waitForLoadState();

			expect(opened.url()).toContain('/traces-explorer');
			expect(opened.url()).toContain('compositeQuery');
			await opened.close();
		});

		test(`B-TRC-07 ${entity.key}: a list error renders the error state`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary as DatasetKey);

			await page.route(/\/api\/v\d+\/query_range/, async (route) => {
				const body = route.request().postData() ?? '';
				if (body.includes('"traces"')) {
					await route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({ status: 'error', error: 'traces exploded' }),
					});
					return;
				}
				await route.continue();
			});

			await page.goto(
				listUrl(entity, { ...selectedItemParams(entity), view: 'traces' }),
			);

			await expectDrawerVisible(page);
			await expect(errorState(page)).toBeVisible();
			await page.unrouteAll();
		});

		test(`B-TRC-05 ${entity.key}: Run refetches without discarding the entity scope`, async ({
			authedPage: page,
		}) => {
			await openTracesTab(page, entity);

			const requests: string[] = [];
			page.on('request', (request) => {
				if (/query_range/.test(request.url())) {
					requests.push(request.url());
				}
			});
			const before = requests.length;

			await runEntityQuery(page, 'traces');

			await expect(async () => {
				expect(requests.length).toBeGreaterThan(before);
			}).toPass();
			await expect(page.locator(SCOPE_CHIP)).toBeVisible();
		});

		test(`B-TRC-04 ${entity.key}: switching away from Traces drops tracesFilters but keeps the expression`, async ({
			authedPage: page,
		}) => {
			await openTracesTab(page, entity, {
				[TRACES_EXPRESSION_PARAM]: "name = 'GET /health'",
				tracesFilters: JSON.stringify({ items: [], op: 'AND' }),
			});

			await switchDrawerTab(page, 'metrics');

			// `handleTabChange` nulls the three `*Filters` params and nothing else, so
			// the user's typed expression outlives the tab. Same contract as B-LOG-04.
			await expect(async () => {
				expect(new URL(page.url()).searchParams.get('tracesFilters')).toBeNull();
			}).toPass();
			expect(new URL(page.url()).searchParams.get(TRACES_EXPRESSION_PARAM)).toBe(
				"name = 'GET /health'",
			);
		});

		test(`B-TRC-08 ${entity.key}: pagination is per-visit — the tab clears it on the way out`, async ({
			authedPage: page,
		}) => {
			await openTracesTab(page, entity, {
				[PAGINATION_PARAM.traces]: JSON.stringify({ offset: 10, limit: 10 }),
			});

			// `EntityTraces` nulls `pagination` in an unmount cleanup, so a deep-linked
			// offset does *not* survive arriving on the tab — unlike the events tab,
			// which keeps `eventsPagination` (B-EVT-04). Asserting the round trip would
			// be asserting the opposite of the shipped contract.
			// The cleanup lands as a *reset to the first page*, not as a removal: the
			// param is rewritten with `offset: 0` and the tab's own page size.
			await expect(async () => {
				expect(paginationFromUrl(page, 'traces')?.offset ?? 0).toBe(0);
			}).toPass();

			// And leaving the tab does not restore the deep-linked offset either.
			await switchDrawerTab(page, 'metrics');
			expect(paginationFromUrl(page, 'traces')?.offset ?? 0).toBe(0);
		});
	});
}
