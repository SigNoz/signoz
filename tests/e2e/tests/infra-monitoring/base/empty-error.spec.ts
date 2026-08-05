/**
 * B-EMP — the list's empty, error and warning branches, plus the console walk.
 *
 * These paths are **route-intercepted rather than seeded**: the seeder cannot
 * produce a 500 or a retention boundary on demand (§6 of the plan).
 */

import type { Page, Route } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { watchConsole } from '../../../helpers/common';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	closeDrawer,
	drawer,
	drawerTab,
	openRowDrawer,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import { expectedTabViews } from '../../../helpers/infra-monitoring/assertions';
import {
	entityByKey,
	fanOut,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	EMPTY_STATE,
	expandGroupRow,
	gotoScopedList,
	groupListBy,
	instrumentationCallout,
	paginationWarning,
	pickQuickFilter,
	resetTableState,
	scopedListUrl,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

/** True for the entity list request, false for `/infra_monitoring/checks`. */
function isListRequest(route: Route): boolean {
	return !route.request().url().includes('/checks');
}

/** Replace the list response with `body`, leaving every other request alone. */
async function stubListResponse(
	page: Page,
	status: number,
	body: unknown,
): Promise<void> {
	await page.route(/\/api\/v\d+\/infra_monitoring\//, async (route) => {
		if (!isListRequest(route)) {
			await route.continue();
			return;
		}
		await route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify(body),
		});
	});
}

async function gotoStubbedList(page: Page, entity: EntityDef): Promise<void> {
	await resetTableState(page, entity);
	await page.goto(scopedListUrl(entity, [entity.seed.sampleName]));
}

for (const entity of fanOut('representative')) {
	test.describe(`B-EMP ${entity.key}`, () => {
		test(`B-EMP-01 ${entity.key}: a 500 renders the error state, not a blank page`, async ({
			authedPage: page,
		}) => {
			await stubListResponse(page, 500, {
				status: 'error',
				error: 'list exploded',
			});
			await gotoStubbedList(page, entity);

			await expect(page.getByTestId(EMPTY_STATE.error)).toBeVisible();
			await page.unrouteAll();
		});

		test(`B-EMP-02 ${entity.key}: endTimeBeforeRetention renders the retention panel`, async ({
			authedPage: page,
		}) => {
			await stubListResponse(page, 200, {
				status: 'success',
				data: { records: [], total: 0, endTimeBeforeRetention: true },
				endTimeBeforeRetention: true,
			});
			await gotoStubbedList(page, entity);

			await expect(page.getByTestId(EMPTY_STATE.retention)).toBeVisible();
			await expect(page.getByTestId(EMPTY_STATE.retention)).toContainText(
				'Queried time range is before earliest K8s metrics',
			);
			await page.unrouteAll();
		});

		test(`B-EMP-03 ${entity.key}: a response warning surfaces in the pagination row`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);

			// Pass the real rows through but graft a warning onto the payload.
			await page.route(/\/api\/v\d+\/infra_monitoring\//, async (route) => {
				if (!isListRequest(route)) {
					await route.continue();
					return;
				}
				const response = await route.fetch();
				const payload = (await response.json()) as {
					data: Record<string, unknown>;
				};
				// The warning lives on `data`, not on the `{status, data}` envelope —
				// grafting it at the top level makes the payload look warning-free.
				await route.fulfill({
					response,
					json: {
						...payload,
						data: {
							...payload.data,
							warning: {
								message: 'partial data',
								warnings: [{ message: 'a shard was unavailable' }],
							},
						},
					},
				});
			});

			await page.goto(scopedListUrl(entity, seeded.names));
			await waitForRows(page);

			await expect(paginationWarning(page)).toBeVisible();
			await page.unrouteAll();
		});

		test(`B-EMP-04 ${entity.key}: the instrumentation callout can be rechecked`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);

			// The callout self-hides unless `ready` is falsy *and* `hasAnyEntries` finds
			// at least one present/missing entry, so the stub has to carry a real
			// `InframonitoringtypesChecksDTO` entry rather than a plausible-looking flag.
			await page.route(/\/api\/v\d+\/infra_monitoring\/checks/, async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						status: 'success',
						data: {
							ready: false,
							missingDefaultEnabledMetrics: [
								{
									associatedComponent: 'k8s-infra',
									documentationLink: 'https://signoz.io/docs',
									message: 'metrics are not being collected',
									metrics: ['k8s.pod.cpu.usage'],
								},
							],
							missingOptionalMetrics: null,
							missingRequiredAttributes: null,
							presentDefaultEnabledMetrics: null,
							presentOptionalMetrics: null,
							presentRequiredAttributes: null,
						},
					}),
				});
			});

			await page.goto(scopedListUrl(entity, seeded.names));
			await waitForRows(page);

			const recheck = instrumentationCallout(page);
			await expect(recheck).toBeVisible();

			const checkRequests: string[] = [];
			page.on('request', (request) => {
				if (request.url().includes('/infra_monitoring/checks')) {
					checkRequests.push(request.url());
				}
			});
			const before = checkRequests.length;

			await recheck.click();

			await expect(async () => {
				expect(checkRequests.length).toBeGreaterThan(before);
			}).toPass();
			await page.unrouteAll();
		});
	});
}

// ─── once-level: the console walk ────────────────────────────────────────────

test.describe('B-EMP console walk', () => {
	const entity = entityByKey('pods');

	test('B-EMP-05 a full list → filter → group → expand → drawer → tabs walk is console-clean', async ({
		authedPage: page,
	}) => {
		// Must be armed before the first navigation.
		const watch = watchConsole(page);

		await resetTableState(page, entity);
		const seeded = await seedDataset(page, entity.seed.grouped as DatasetKey);
		const primary = await seedDataset(page, entity.seed.primary as DatasetKey);

		await gotoScopedList(page, entity, [...seeded.names, ...primary.names]);
		await waitForRows(page);

		// Filter.
		await pickQuickFilter(page, entity.quickFilterTitles[0], primary.names[0]);

		// Group and expand.
		await gotoScopedList(page, entity, seeded.names);
		await waitForRows(page);
		await groupListBy(page, entity.groupByAttribute);
		await expandGroupRow(page, entity.seed.sampleGroup);

		// Drawer, then every tab it offers.
		await gotoScopedList(page, entity, primary.names);
		await waitForRow(page, entity.seed.sampleItemKey);
		await openRowDrawer(page, entity.seed.sampleItemKey);
		for (const view of expectedTabViews(entity)) {
			await switchDrawerTab(page, view);
			await expect(drawerTab(page, view)).toHaveAttribute('data-state', 'on');
		}
		await closeDrawer(page);
		await expect(drawer(page)).toHaveCount(0);

		expect(watch.errors, 'console errors').toEqual([]);
		expect(watch.failedResponses, 'unexpected 4xx/5xx').toEqual([]);
	});
});
