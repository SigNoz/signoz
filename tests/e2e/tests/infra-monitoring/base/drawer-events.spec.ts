/**
 * B-EVT — the drawer's Events tab, on the nine k8s entities that enable it.
 *
 * Events are scoped differently from logs and traces: by `k8s.object.kind` and
 * `k8s.object.name` (plus cluster/namespace where the entity has them), built by
 * `getInitialEventsExpression`. Hosts has `showEvents: false`, so it is excluded
 * by the capability gate rather than by a skip.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	expectDrawerVisible,
	emptyState,
	errorState,
	eventsNotConfigured,
	PAGINATION_PARAM,
	paginationFromUrl,
	SCOPE_CHIP,
	selectedItemParams,
	switchDrawerTab,
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

/** `useInfraMonitoringEventsFilters`' param. */
const EVENTS_FILTERS_PARAM = 'eventsFilters';

async function openEventsTab(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary as DatasetKey);
	await page.goto(
		listUrl(entity, {
			...selectedItemParams(entity),
			view: 'events',
			...overrides,
		}),
	);
	await expectDrawerVisible(page);
}

for (const entity of fanOut('representative', 'eventsTab')) {
	test.describe(`B-EVT ${entity.key}`, () => {
		test(`B-EVT-01 ${entity.key}: events are pre-filtered by the entity's object identity`, async ({
			authedPage: page,
		}) => {
			await openEventsTab(page, entity);

			// The `k8s.object.kind` + `k8s.object.name` scope is a non-editable chip.
			await expect(page.locator(SCOPE_CHIP)).toBeVisible();
		});

		test(`B-EVT-05 ${entity.key}: with no events at all, the not-configured panel shows`, async ({
			authedPage: page,
		}) => {
			await openEventsTab(page, entity);

			// Nothing seeds k8s events, so the tab lands on one of its two empty
			// branches: "receiver not configured" when there are no events anywhere,
			// or the ordinary empty state when there are some but none match.
			await expect(
				eventsNotConfigured(page).or(emptyState(page)).first(),
			).toBeVisible();
		});

		test(`B-EVT-06 ${entity.key}: a user expression is kept, and a tab switch clears it`, async ({
			authedPage: page,
		}) => {
			await openEventsTab(page, entity, {
				[EVENTS_FILTERS_PARAM]: JSON.stringify({ items: [], op: 'AND' }),
			});

			await expect(async () => {
				expect(
					new URL(page.url()).searchParams.get(EVENTS_FILTERS_PARAM),
				).not.toBeNull();
			}).toPass();

			await switchDrawerTab(page, 'metrics');

			await expect(async () => {
				expect(
					new URL(page.url()).searchParams.get(EVENTS_FILTERS_PARAM),
				).toBeNull();
			}).toPass();
		});

		test(`B-EVT-04 ${entity.key}: the pagination param round-trips`, async ({
			authedPage: page,
		}) => {
			await openEventsTab(page, entity, {
				[PAGINATION_PARAM.events]: JSON.stringify({ offset: 10, limit: 10 }),
			});

			expect(paginationFromUrl(page, 'events')).toEqual({ offset: 10, limit: 10 });

			await page.reload();
			await expectDrawerVisible(page);
			expect(paginationFromUrl(page, 'events')).toEqual({ offset: 10, limit: 10 });
		});

		test(`B-EVT-07 ${entity.key}: a query error renders the error state`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary as DatasetKey);

			await page.route(/\/api\/v\d+\/query_range/, async (route) => {
				const body = route.request().postData() ?? '';
				// The events tab queries the logs signal with a k8s.object scope.
				if (body.includes('k8s.object')) {
					await route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({ status: 'error', error: 'events exploded' }),
					});
					return;
				}
				await route.continue();
			});

			await page.goto(
				listUrl(entity, { ...selectedItemParams(entity), view: 'events' }),
			);

			await expectDrawerVisible(page);
			await expect(errorState(page)).toBeVisible();
			await page.unrouteAll();
		});
	});
}

/**
 * Hosts passes `tabsConfig={{ showEvents: false }}`, so the tab must not exist —
 * asserted here rather than left implicit in the capability gate above.
 */
test.describe('B-EVT hosts exclusion', () => {
	const hosts = fanOut('all').find((entity) => entity.key === 'hosts')!;

	test('B-EVT-08 hosts has no Events tab and ?view=events coerces away', async ({
		authedPage: page,
	}) => {
		expect(hosts.capabilities.has('eventsTab')).toBe(false);

		await openEventsTab(page, hosts);

		await expect(page.getByTestId('drawer-tab-events')).toHaveCount(0);
		await expect(async () => {
			expect(new URL(page.url()).searchParams.get('view')).not.toBe('events');
		}).toPass();
	});
});
