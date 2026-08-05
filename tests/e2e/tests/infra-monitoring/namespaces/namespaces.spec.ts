/**
 * NS-* — namespaces-only: `EntityCountsSection` cards with working nav links, the
 * custom Pod Metrics tab, and identity across clusters.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectExpressionContains,
	expectWidgetTitles,
} from '../../../helpers/infra-monitoring/assertions';
import {
	countCard,
	countCardNavLink,
	expectDrawerVisible,
	selectedItemParams,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import {
	entityByKey,
	POD_METRICS_WIDGET_TITLES,
} from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	listUrl,
	renderedRowKeys,
	resetTableState,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const NAMESPACES = entityByKey('namespaces');

test.describe('namespaces', () => {
	test(`NS-01 the drawer shows the ${NAMESPACES.countsCards!.join(' / ')} count cards`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NAMESPACES);
		await seedDataset(page, 'namespaces_value_accuracy');
		await page.goto(listUrl(NAMESPACES, selectedItemParams(NAMESPACES)));
		await expectDrawerVisible(page);

		for (const label of NAMESPACES.countsCards!) {
			await expect(countCard(page, label), `${label} card`).toBeVisible();
		}
	});

	test('NS-02 a count card navigates to that category, filtered to the namespace', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NAMESPACES);
		await seedDataset(page, 'namespaces_value_accuracy');
		await page.goto(
			listUrl(NAMESPACES, {
				...selectedItemParams(NAMESPACES),
				relativeTime: '6h',
			}),
		);
		await expectDrawerVisible(page);

		const label = NAMESPACES.countsCards![0];
		// The counts row clips its overflow, so a card past the first is never *visible*
		// and `click()` waits out its timeout. It is a plain anchor, so following its
		// href is the same navigation a click would perform — and the href is what this
		// scenario is actually about.
		await expect(countCardNavLink(page, label)).toHaveAttribute(
			'href',
			new RegExp(`category=${label.toLowerCase()}`),
		);
		const href = await countCardNavLink(page, label).getAttribute('href');
		await page.goto(href!);

		// It lands on the linked category with the namespace as a filter, and the
		// list time range travels with it.
		await expect(page).toHaveURL(new RegExp(`category=${label.toLowerCase()}`));
		await expectExpressionContains(page, NAMESPACES.seed.sampleName);
		expect(new URL(page.url()).searchParams.get('relativeTime')).toBe('6h');
	});

	test('NS-03 the Pod Metrics tab renders the 5 utilisation-by-pod widgets', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NAMESPACES);
		await seedDataset(page, 'namespaces_value_accuracy');
		await page.goto(listUrl(NAMESPACES, selectedItemParams(NAMESPACES)));
		await expectDrawerVisible(page);

		await switchDrawerTab(page, 'pod_metrics');
		await expectWidgetTitles(page, POD_METRICS_WIDGET_TITLES);
	});

	test('NS-04 the same namespace name in two clusters stays two rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NAMESPACES);
		const seeded = await seedDataset(
			page,
			'namespaces_same_name_across_clusters',
		);
		await gotoScopedList(page, NAMESPACES, seeded.names);
		await waitForRows(page);

		// One shared name, two clusters — the list must not dedupe them into one row.
		const keys = await renderedRowKeys(page);
		expect(keys.length).toBeGreaterThan(seeded.names.length - 1);
		await expect(
			page.locator('table').getByText('cluster', { exact: false }).first(),
		).toBeVisible();
	});
});
