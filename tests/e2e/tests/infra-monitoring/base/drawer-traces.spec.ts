/**
 * B-TRC — the drawer's Traces tab. Scenarios 01 through 07 are the contract it
 * shares with B-LOG and live in `drawer-query-tab.ts`; what stays here is what
 * has no logs counterpart: the `pagination` param the traces list drives paging
 * with, and the trace column set.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	PAGINATION_PARAM,
	paginationFromUrl,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import { fanOut } from '../../../helpers/infra-monitoring/entities';

import { describeQueryTab, openQueryTab } from './drawer-query-tab';

describeQueryTab({
	tab: 'traces',
	tag: 'B-TRC',
	capability: 'tracesTab',
	sampleExpression: "name = 'GET /health'",
	explorerPath: '/traces-explorer',
	filtersParam: 'tracesFilters',
});

for (const entity of fanOut('representative', 'tracesTab')) {
	test.describe(`B-TRC ${entity.key} traces-only`, () => {
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

			await openQueryTab(page, entity, 'traces');

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
			await openQueryTab(page, entity, 'traces', {
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
