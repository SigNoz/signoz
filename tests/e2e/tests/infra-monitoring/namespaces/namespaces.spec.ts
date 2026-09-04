/**
 * NS-* — namespaces-only: `EntityCountsSection` cards with working nav links, the
 * custom Pod Metrics tab, and identity across clusters.
 */

import { expect, test } from '../../../fixtures/auth';
import { expectedRecord } from '../../../helpers/infra-monitoring/datasets';
import { expectExpressionContains } from '../../../helpers/infra-monitoring/assertions';
import {
	countCard,
	countCardNavLink,
	expectDrawerVisible,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	listUrl,
	renderedRowKeys,
	resetTableState,
	rowFor,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const NAMESPACES = entityByKey('namespaces');

test.describe('namespaces', () => {
	test(`TC-01 the drawer shows the ${NAMESPACES.countsCards!.join(' / ')} count cards`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NAMESPACES);
		await seedDataset(page, 'namespaces_value_accuracy');
		await page.goto(listUrl(NAMESPACES, selectedItemParams(NAMESPACES)));
		await expectDrawerVisible(page);

		// The seeded counts, not just "a card rendered". The integration suite's own
		// `namespaces_value_accuracy_expected.json` is the source, which is what §6
		// means by reusing it "instead of inventing numbers" — and it records a zero
		// (`statefulSets`), so the plan's "a zero count renders TextNoData" branch is
		// covered too.
		const counts = expectedRecord(
			'namespaces_value_accuracy',
			'namespaceName',
			NAMESPACES.seed.sampleName,
		).counts as Record<string, number>;
		const FIELD: Record<string, string> = {
			Deployments: 'deployments',
			StatefulSets: 'statefulSets',
			DaemonSets: 'daemonSets',
			Jobs: 'jobs',
		};

		for (const label of NAMESPACES.countsCards!) {
			const card = countCard(page, label);
			await expect(card, `${label} card`).toBeVisible();
			// A zero renders `TextNoData` (a dash), not the digit — which is the
			// plan's own "a zero count renders TextNoData" clause, and `acc-ns-1`
			// seeds exactly one (`statefulSets: 0`) so the branch is covered.
			const expected = counts[FIELD[label]];
			await expect(card, `${label} count`).toContainText(
				expected === 0 ? '-' : String(expected),
			);
		}
	});

	test('TC-02 a count card navigates to that category, filtered to the namespace', async ({
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

	test('TC-04 the same namespace name in two clusters stays two rows', async ({
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

	test('TC-05 a namespace missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NAMESPACES);
		const seeded = await seedDataset(page, 'namespaces_missing_metrics');
		await gotoScopedList(page, NAMESPACES, seeded.names);
		await waitForRows(page);

		// The *specific* cell, matched exactly. `getByText('-')` is a
		// case-insensitive **substring** match and the seeded namespace is called
		// `miss-ns`, so it would be satisfied by the name cell whatever the memory
		// column rendered. `namespaces_missing_metrics` seeds only
		// `k8s.pod.cpu.usage`, so the memory roll-up has nothing to sum.
		const memoryCell = rowFor(page, seeded.names[0]).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});
});
