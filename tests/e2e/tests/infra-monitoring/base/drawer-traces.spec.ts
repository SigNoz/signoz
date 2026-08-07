/**
 * B-TRC — the drawer's Traces tab. Mirrors B-LOG with the traces expression key,
 * plus the `pagination` param the traces list drives paging with.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	EXPLORER_LINK,
	PAGINATION_PARAM,
	SCOPE_CHIP,
	TAB_USER_EXPRESSION_PARAM,
	emptyState,
	entityRunQueryButton,
	errorState,
	expectDrawerVisible,
	paginationFromUrl,
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

const TRACES_EXPRESSION_PARAM = TAB_USER_EXPRESSION_PARAM.traces;

async function openTracesTab(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary);
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
			// `expectDrawerVisible` alone may spend the whole default budget on a cold
			// deep link (§11.1), and this scenario needs the error state on top of it.
			allowForSeededWait();
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary);

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

			// Wait for the tab *body* before arming anything. `openTracesTab` returns
			// once the drawer shell is up, which is before the tab's own initial
			// `query_range` fires — so that request satisfied `length > before` while
			// the Run button was still mounting, and deleting the `runEntityQuery`
			// call below left the test green.
			await expect(page.locator(SCOPE_CHIP)).toBeVisible({ timeout: 30_000 });
			await expect(entityRunQueryButton(page, 'traces')).toBeVisible();

			// Tie the assertion to the click: wait for a request that starts *after*
			// it, rather than counting ones that may predate it.
			const refetch = page.waitForRequest(
				(request) => /query_range/.test(request.url()),
				{ timeout: 15_000 },
			);
			await runEntityQuery(page, 'traces');
			await refetch;
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

		test(`B-TRC-09 ${entity.key}: the trace columns render and a row opens the trace detail page`, async ({
			authedPage: page,
		}) => {
			// Nothing seeds traces — `seed.ts` posts only `/telemetry/metrics` — so the
			// row comes from a stub. Discriminate on the traces signal the way B-TRC-07
			// does; a blanket stub would also answer the list page's own query_range.
			await page.route(/\/api\/v\d+\/query_range/, async (route) => {
				const body = route.request().postData() ?? '';
				if (body.includes('"traces"')) {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(stubbedTracesResponse()),
					});
					return;
				}
				await route.continue();
			});

			await openTracesTab(page, entity);

			const cell = page.getByTestId('serviceName').first();
			await expect(cell).toHaveText(STUB_TRACE.serviceName, { timeout: 30_000 });

			// `getTraceListColumns` builds one column per `selectedEntityTracesColumns`
			// entry; all six are `responsive: ['md']`, which the 1280px project viewport
			// clears.
			const headers = await page
				.getByRole('columnheader')
				.allInnerTexts()
				.then((texts) => texts.map((text) => text.trim()));
			expect(headers).toEqual(
				expect.arrayContaining([
					'Timestamp',
					'Service Name',
					'Name',
					'Duration',
					'HTTP Method',
					'Status Code',
				]),
			);
			await expect(page.getByTestId('name').first()).toHaveText(STUB_TRACE.name);
			await expect(page.getByTestId('durationNano').first()).toHaveText('5.00ms');
			await expect(page.getByTestId('httpMethod').first()).toHaveText(
				STUB_TRACE.httpMethod,
			);

			// The navigation is the cell, not the row: every cell is wrapped in
			// `BlockLink to={getTraceLink(...)} openInNewTab`, i.e. an `<a
			// target="_blank">`. `onRow.onClick` only logs the analytics event, so the
			// trace detail page arrives as a *new tab*, like B-TRC-06's compass.
			const [opened] = await Promise.all([
				page.context().waitForEvent('page'),
				cell.click(),
			]);
			await opened.waitForLoadState('domcontentloaded');

			const openedUrl = new URL(opened.url());
			expect(openedUrl.pathname).toBe(`/trace/${STUB_TRACE.traceID}`);
			expect(openedUrl.searchParams.get('spanId')).toBe(STUB_TRACE.spanID);
			await opened.close();
			await page.unrouteAll();
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

const STUB_TRACE = {
	serviceName: 'checkout-service',
	name: 'GET /api/checkout',
	durationNano: 5_000_000,
	httpMethod: 'GET',
	responseStatusCode: '200',
	traceID: 'e2e-trace-id-0',
	spanID: 'e2e-span-id-0',
} as const;

/**
 * The raw v5 `query_range` shape — `data.data.results[].rows` — which
 * `GetMetricQueryRange` folds into the `newResult…list` `useEntityTraces` reads.
 * Not the `data.result[].list` shape the older stubs in this suite use; the
 * traces tab is v5 (`ENTITY_VERSION_V5`) and ignores it.
 */
function stubbedTracesResponse(): unknown {
	return {
		data: {
			type: 'raw',
			data: {
				results: [
					{
						queryName: 'A',
						nextCursor: '',
						rows: [{ timestamp: new Date().toISOString(), data: { ...STUB_TRACE } }],
					},
				],
			},
			meta: { bytesScanned: 0, durationMs: 10, rowsScanned: 1, stepIntervals: {} },
		},
	};
}
