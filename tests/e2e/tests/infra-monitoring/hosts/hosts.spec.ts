/**
 * H-* — what only the hosts route does: its own URL with no category rail, the
 * `StatusFilter` in `leftFilters`, and `tabsConfig={{ showEvents: false }}`.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectFirstPage,
	expectQuickFilterSections,
	expectUrlParams,
} from '../../../helpers/infra-monitoring/assertions';
import {
	drawer,
	openRowDrawer,
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
		for (const label of HOSTS.metadataLabels!) {
			await expect(drawer(page).getByText(label, { exact: true })).toBeVisible();
		}
	});

	/**
	 * The column swap and the expand button are `B-GRP-02 hosts`. What only a
	 * fixture can reach is that the real OS values seeded here become the group
	 * rows, and that grouping replaces the host rows rather than nesting beside
	 * them.
	 */
	test(`H-07 hosts group by ${HOSTS.groupByAttribute} renders one row per OS and no host rows`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		await seedDataset(page, 'hosts_groupby_os_type');
		await page.goto(listUrl(HOSTS));
		await waitForRows(page);

		await groupListBy(page, HOSTS.groupByAttribute);

		await expect(groupRowFor(page, 'linux')).toBeVisible();
		await expect(groupRowFor(page, 'windows')).toBeVisible();
		// A grouped row is not a data row.
		await expect(rowFor(page, HOSTS.seed.sampleItemKey)).toHaveCount(0);
	});

	test('H-08 a host missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, HOSTS);
		const seeded = await seedDataset(page, 'hosts_missing_metrics');
		await gotoScopedList(page, HOSTS, seeded.names);
		await waitForRows(page);

		// The *specific* cell, matched exactly. `getByText('-')` is a
		// case-insensitive **substring** match and the seeded host is called
		// `miss-h1`, so it would be satisfied by the name cell whatever the memory
		// column rendered. `hosts_missing_metrics` seeds only `system.cpu.time`, so
		// memory has no series and the cell is `TextNoData`.
		const memoryCell = rowFor(page, seeded.names[0]).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});
});
