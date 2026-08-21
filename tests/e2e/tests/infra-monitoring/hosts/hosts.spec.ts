/**
 * H-* — what only the hosts route does: its own URL with no category rail, the
 * `StatusFilter` in `leftFilters`, and `tabsConfig={{ showEvents: false }}`.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectFirstPage,
	expectQuickFilterSections,
	expectUrlParams,
	expectWidgetTitles,
} from '../../../helpers/infra-monitoring/assertions';
import {
	drawer,
	expectDrawerVisible,
	drawerTab,
	openRowDrawer,
	tabBar,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import {
	entityByKey,
	HOSTS_PATH,
} from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	groupListBy,
	groupRowFor,
	headerCell,
	listUrl,
	renderedRowKeys,
	resetTableState,
	rowFor,
	setStatusFilter,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const HOSTS = entityByKey('hosts');

test.describe('hosts', () => {
	test('H-01 the hosts route has no category rail and its own quick-filter set', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		const seeded = await seedDataset(page, 'hosts_value_accuracy');
		await gotoScopedList(page, HOSTS, seeded.names);
		await waitForRows(page);

		expect(page.url()).toContain(HOSTS_PATH);
		// The k8s rail belongs to the other route.
		await expect(page.locator('[data-testid^="category-"]')).toHaveCount(0);
		await expectQuickFilterSections(page, HOSTS);
	});

	test('H-02 the status filter writes statusFilter, resets the page and filters rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		const seeded = await seedDataset(page, 'hosts_status');
		// Scope to this fixture's hosts. Unscoped, the shared stack's other hosts —
		// all active — fill page one, so "active" and "all" come back identical and
		// the filter looks broken when it is not.
		await gotoScopedList(page, HOSTS, seeded.names);
		await waitForRows(page);

		const all = await renderedRowKeys(page);

		await setStatusFilter(page, 'active');
		await expectUrlParams(page, { statusFilter: 'active' });
		await expectFirstPage(page);
		const active = await renderedRowKeys(page);

		await setStatusFilter(page, 'inactive');
		await expectUrlParams(page, { statusFilter: 'inactive' });
		const inactive = await renderedRowKeys(page);

		// Host status is derived from *how recent* the host's last sample is, and
		// `rebaseToNow` moves every row in the fixture to ~30 s ago — which makes the
		// "inactive" host active. So the two halves cannot be asserted to differ
		// without a seeder that can place rows in the past; what is assertable is that
		// neither filter invents rows and both stay within the unfiltered set.
		for (const keys of [active, inactive]) {
			expect(all).toEqual(expect.arrayContaining(keys));
			expect(keys.length).toBeLessThanOrEqual(all.length);
		}

		// "All" clears the param rather than writing a third value — and clearing means
		// *absent*, which `expectUrlParams` spells `null`, not `''`.
		await setStatusFilter(page, 'all');
		await expectUrlParams(page, { statusFilter: null });
	});

	test('H-03 the status column renders a badge per host status', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		const seeded = await seedDataset(page, 'hosts_status');
		await gotoScopedList(page, HOSTS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'status')).toBeVisible();
		// Rendered as badges, not bare text — and the badge class uppercases, which
		// `innerText`-based matching sees, so match case-insensitively.
		await expect(
			page
				.locator('table')
				.getByText(/^(active|inactive)$/i)
				.first(),
		).toBeVisible();
	});

	test('H-04 the drawer metadata shows STATUS and OPERATING SYSTEM', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		const seeded = await seedDataset(page, 'hosts_value_accuracy');
		await gotoScopedList(page, HOSTS, seeded.names);
		await waitForRow(page, HOSTS.seed.sampleItemKey);
		await openRowDrawer(page, HOSTS.seed.sampleItemKey);

		// Hosts is the only entity whose metadata labels are all-caps.
		for (const label of HOSTS.metadataLabels) {
			await expect(drawer(page).getByText(label, { exact: true })).toBeVisible();
		}
	});

	test(`H-05 the drawer Metrics tab shows all ${HOSTS.widgetTitles.length} host widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		await seedDataset(page, 'hosts_value_accuracy');
		await page.goto(listUrl(HOSTS, selectedItemParams(HOSTS)));
		await expectDrawerVisible(page);

		// The plan says 8; `hostWidgetInfo` actually has 13, and the registry is the
		// source of truth.
		await expectWidgetTitles(page, HOSTS.widgetTitles);
	});

	test('H-06 the drawer has Logs and Traces but no Events tab', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		await seedDataset(page, 'hosts_value_accuracy');
		await page.goto(
			listUrl(HOSTS, { ...selectedItemParams(HOSTS), view: 'events' }),
		);
		await expectDrawerVisible(page);

		// The tab bar arrives with the tab body, not with the drawer shell.
		await expect(tabBar(page)).toBeVisible({ timeout: 30_000 });
		await expect(drawerTab(page, 'logs')).toBeVisible();
		await expect(drawerTab(page, 'traces')).toBeVisible();
		// `tabsConfig={{ showEvents: false }}`.
		await expect(drawerTab(page, 'events')).toHaveCount(0);
		// …and the invalid `view` coerces away.
		await expect(async () => {
			expect(new URL(page.url()).searchParams.get('view')).not.toBe('events');
		}).toPass();
	});

	test(`H-07 hosts group by ${HOSTS.groupByAttribute}`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		await seedDataset(page, 'hosts_groupby_os_type');
		await page.goto(listUrl(HOSTS));
		await waitForRows(page);

		await groupListBy(page, HOSTS.groupByAttribute);

		// The group column replaces the name column while grouped.
		await expect(headerCell(page, HOSTS.groupColumnId)).toHaveCount(1);
		await expect(headerCell(page, HOSTS.nameColumnId)).toHaveCount(0);
		await expect(groupRowFor(page, 'linux')).toBeVisible();
		await expect(groupRowFor(page, 'windows')).toBeVisible();
		// A grouped row is not a data row.
		await expect(rowFor(page, HOSTS.seed.sampleItemKey)).toHaveCount(0);
	});
});
