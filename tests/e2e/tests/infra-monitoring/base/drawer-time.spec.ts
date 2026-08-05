/**
 * B-TIME — the two independent time ranges: the list's (`relativeTime` /
 * `startTime` / `endTime`) and the drawer's own (`detailRelativeTime` /
 * `detailStartTime` / `detailEndTime`).
 *
 * B-TIME-05 is the ported `drawer-explorer-link.spec.ts` regression. `1month` is
 * not a `\d+[mhdw]` shorthand, so it used to be discarded by every url-sync path
 * and silently replaced with the route default `30m`.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { expectUrlParams } from '../../../helpers/infra-monitoring/assertions';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	expectDrawerVisible,
	drawerTimeParams,
	drawerTimePicker,
	metricsExplorerLinkTestId,
	resetDrawerTimeToList,
	resetToListTimeButton,
	selectedItemParams,
	setDrawerTime,
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
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

/** The list's default relative range, from `defaultRelativeTime="30m"`. */
const LIST_DEFAULT_RELATIVE_TIME = '30m';

/**
 * The dropdown labels relative options with their shorthand badge ("Last 6
 * hours 6h"); month options carry no badge.
 */
const RANGES = [
	{ value: '6h', option: 'Last 6 hours 6h', label: 'Last 6 hours' },
	{ value: '1month', option: 'Last 1 month', label: 'Last 1 month' },
];

async function openDrawer(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary as DatasetKey);
	await page.goto(
		listUrl(entity, {
			relativeTime: LIST_DEFAULT_RELATIVE_TIME,
			...selectedItemParams(entity),
			...overrides,
		}),
	);
	await expectDrawerVisible(page);
}

// ─── all-level: the `1month` regression, on every entity ──────────────────────

for (const entity of fanOut('all')) {
	test.describe(`B-TIME ${entity.key} ${WIDE_TAG}`, () => {
		test(`B-TIME-05 ${entity.key}: 1month survives every url-sync path`, async ({
			authedPage: page,
		}) => {
			await openDrawer(page, entity);

			await setDrawerTime(page, 'Last 1 month');

			// The drawer's own key carries the long form, and the list keeps 30m.
			await expect(async () => {
				expect(drawerTimeParams(page).relativeTime).toBe('1month');
			}).toPass();
			await expectUrlParams(page, {
				relativeTime: LIST_DEFAULT_RELATIVE_TIME,
			});
			await expect(
				drawerTimePicker(page).getByRole('textbox', { name: 'Last 1 month' }),
			).toBeVisible();
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`B-TIME ${entity.key}`, () => {
		test(`B-TIME-08 ${entity.key}: the list defaults to ${LIST_DEFAULT_RELATIVE_TIME} on a cold load`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);
			await gotoScopedList(page, entity, seeded.names);
			await waitForRows(page);

			await expectUrlParams(page, {
				relativeTime: LIST_DEFAULT_RELATIVE_TIME,
			});
		});

		test(`B-TIME-02 ${entity.key}: the drawer's picker is independent of the list's`, async ({
			authedPage: page,
		}) => {
			await openDrawer(page, entity);

			await setDrawerTime(page, 'Last 6 hours 6h');

			await expect(async () => {
				expect(drawerTimeParams(page).relativeTime).toBe('6h');
			}).toPass();
			// The list's own range is untouched.
			await expectUrlParams(page, {
				relativeTime: LIST_DEFAULT_RELATIVE_TIME,
			});
		});

		test(`B-TIME-03 ${entity.key}: an absolute drawer range round-trips at second precision`, async ({
			authedPage: page,
		}) => {
			// The drawer keeps its range in seconds, so whole seconds only.
			const endTime = Math.floor(Date.now() / 1000) * 1000;
			const startTime = endTime - 60 * 60 * 1000;

			await openDrawer(page, entity, {
				detailStartTime: String(startTime),
				detailEndTime: String(endTime),
			});

			const params = drawerTimeParams(page);
			expect(params.startTime).toBe(String(startTime));
			expect(params.endTime).toBe(String(endTime));

			await page.reload();
			await expectDrawerVisible(page);
			const afterReload = drawerTimeParams(page);
			expect(afterReload.startTime).toBe(String(startTime));
			expect(afterReload.endTime).toBe(String(endTime));
		});

		test(`B-TIME-04 ${entity.key}: reset-to-list-time appears only after a change`, async ({
			authedPage: page,
		}) => {
			await openDrawer(page, entity);

			// `hasTimeChanged` is false while the drawer inherits the list's range.
			await expect(resetToListTimeButton(page)).toHaveCount(0);

			await setDrawerTime(page, 'Last 6 hours 6h');
			await expect(resetToListTimeButton(page)).toBeVisible();

			await resetDrawerTimeToList(page);
			await expect(resetToListTimeButton(page)).toHaveCount(0);
			await expectUrlParams(page, {
				relativeTime: LIST_DEFAULT_RELATIVE_TIME,
				detailRelativeTime: null,
			});
		});

		test(`B-TIME-01 ${entity.key}: changing the list range refires the list request`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);
			await gotoScopedList(page, entity, seeded.names);
			await waitForRows(page);

			const listRequests: string[] = [];
			page.on('request', (request) => {
				const url = request.url();
				if (/infra_monitoring/.test(url) && !url.includes('/checks')) {
					listRequests.push(url);
				}
			});
			const before = listRequests.length;

			// The list's picker is the one outside the drawer.
			await page.getByRole('textbox', { name: /Last / }).first().click();
			await page.getByRole('button', { name: 'Last 6 hours 6h' }).click();

			await expectUrlParams(page, { relativeTime: '6h' });
			await expect(async () => {
				expect(listRequests.length).toBeGreaterThan(before);
			}).toPass();
		});
	});
}

// ─── once-level: the drawer range reaches every tab, and the explorer link ────

test.describe('B-TIME drawer range propagation', () => {
	test.describe.configure({ mode: 'serial' });

	const entity = fanOut('once')[0];

	for (const { value, option, label } of RANGES) {
		test(`B-TIME-05b a ${value} drawer range reaches the metrics-explorer link`, async ({
			authedPage: page,
		}) => {
			await openDrawer(page, entity);

			await setDrawerTime(page, option);
			await expect(
				drawerTimePicker(page).getByRole('textbox', { name: label }),
			).toBeVisible();
			await expect(async () => {
				expect(drawerTimeParams(page).relativeTime).toBe(value);
			}).toPass();

			const compass = page.getByTestId(metricsExplorerLinkTestId(0));
			await expect(compass).toBeVisible();
			const href = await compass.getAttribute('href');
			expect(href, 'the compass carries the drawer range').toContain(
				`relativeTime=${value}`,
			);
		});
	}

	test('B-TIME-07 a drawer-time change is honoured by every tab', async ({
		authedPage: page,
	}) => {
		await openDrawer(page, entity);
		await setDrawerTime(page, 'Last 6 hours 6h');
		await expect(async () => {
			expect(drawerTimeParams(page).relativeTime).toBe('6h');
		}).toPass();

		// Switching tabs must not reset the drawer's own range.
		for (const view of ['logs', 'traces', 'events'] as const) {
			await page.getByTestId(`drawer-tab-${view}`).click();
			await expect(page).toHaveURL(new RegExp(`view=${view}\\b`));
			expect(drawerTimeParams(page).relativeTime, `${view} keeps 6h`).toBe('6h');
		}
	});
});
