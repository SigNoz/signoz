import { expect, test } from '../../fixtures/auth';
import { seedPodMetricsViaSeeder } from '../../helpers/infra-monitoring';
import {
	expectK8sGroupedBy,
	expectK8sNotGroupedBy,
	gotoK8sList,
	historyDepth,
	K8S_LIST_PATH,
	K8S_NAMESPACE_ATTR,
	relativeTimeLabel,
	seedWithRetry,
	selectRelativeTime,
	setK8sGroupBy,
	timePicker,
	urlOf,
} from '../../helpers/routing';

// Guards hazard 2, the nuqs adapter swap. The k8s list is the one page where
// both param families meet on equal terms: `groupBy` is written by nuqs straight
// to the History API with `history: 'push'`, while `relativeTime` is written by
// the router through `useSafeNavigate` off a `getUnstableCurrentSearchParams()`
// read. Param ownership changes twice over this migration (Phase D, Phase E),
// and these four are the acceptance tests for deleting that workaround.

const CATEGORY_PODS = 'category=pods';

test.describe('Routing — nuqs and router param coexistence', () => {
	test.beforeAll(async ({ browser }) => {
		// Group-by options come from /fields/keys over the queried window, so the
		// select is empty until pod metrics exist inside it.
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		try {
			await seedWithRetry(() => seedPodMetricsViaSeeder(page));
		} finally {
			await ctx.close();
		}
	});

	test('TC-01 a router write keeps the nuqs params it did not author', async ({
		authedPage: page,
	}) => {
		await gotoK8sList(page, `${CATEGORY_PODS}&relativeTime=30m`);

		await setK8sGroupBy(page, K8S_NAMESPACE_ATTR);
		await selectRelativeTime(page, '1h');
		await page.waitForURL((url) => url.searchParams.get('relativeTime') === '1h');

		const url = urlOf(page);
		expect(url.pathname).toBe(K8S_LIST_PATH);
		expect(url.searchParams.get('relativeTime')).toBe('1h');
		expect(url.searchParams.get('category')).toBe('pods');
		expect(url.searchParams.get('groupBy') ?? '').toContain(K8S_NAMESPACE_ATTR);

		await expectK8sGroupedBy(page, K8S_NAMESPACE_ATTR);
	});

	test('TC-02 a nuqs write keeps the relativeTime the router authored', async ({
		authedPage: page,
	}) => {
		await gotoK8sList(page, `${CATEGORY_PODS}&relativeTime=30m`);

		await selectRelativeTime(page, '6h');
		await page.waitForURL((url) => url.searchParams.get('relativeTime') === '6h');

		await setK8sGroupBy(page, K8S_NAMESPACE_ATTR);

		const url = urlOf(page);
		expect(url.pathname).toBe(K8S_LIST_PATH);
		expect(url.searchParams.get('relativeTime')).toBe('6h');
		expect(url.searchParams.get('groupBy') ?? '').toContain(K8S_NAMESPACE_ATTR);

		await expect(timePicker(page)).toHaveAccessibleName(relativeTimeLabel('6h'));
	});

	test('TC-03 POP across a nuqs push reverts both url and list', async ({
		authedPage: page,
	}) => {
		await gotoK8sList(page, `${CATEGORY_PODS}&relativeTime=30m`);

		const depthBeforeGroupBy = await historyDepth(page);
		await setK8sGroupBy(page, K8S_NAMESPACE_ATTR);

		// One nuqs flush, one history entry — otherwise a single Back below would
		// land on an intermediate url instead of the ungrouped list.
		expect(await historyDepth(page)).toBe(depthBeforeGroupBy + 1);
		await expectK8sGroupedBy(page, K8S_NAMESPACE_ATTR);

		await page.goBack();
		await page.waitForURL(
			(url) =>
				!(url.searchParams.get('groupBy') ?? '').includes(K8S_NAMESPACE_ATTR),
		);
		expect(urlOf(page).pathname).toBe(K8S_LIST_PATH);
		await expectK8sNotGroupedBy(page, K8S_NAMESPACE_ATTR);

		await page.goForward();
		await page.waitForURL((url) =>
			(url.searchParams.get('groupBy') ?? '').includes(K8S_NAMESPACE_ATTR),
		);
		await expectK8sGroupedBy(page, K8S_NAMESPACE_ATTR);
	});

	test('TC-04 a deep link carrying both families applies both on first paint', async ({
		authedPage: page,
	}) => {
		const groupBy = encodeURIComponent(JSON.stringify([K8S_NAMESPACE_ATTR]));
		await gotoK8sList(
			page,
			`${CATEGORY_PODS}&relativeTime=6h&groupBy=${groupBy}`,
		);

		// gotoK8sList already waited for the mount-time compositeQuery republish,
		// so anything dropped by it would be missing by now.
		const url = urlOf(page);
		expect(url.pathname).toBe(K8S_LIST_PATH);
		expect(url.searchParams.get('relativeTime')).toBe('6h');
		expect(url.searchParams.get('groupBy') ?? '').toContain(K8S_NAMESPACE_ATTR);

		await expect(timePicker(page)).toHaveAccessibleName(relativeTimeLabel('6h'));
		await expectK8sGroupedBy(page, K8S_NAMESPACE_ATTR);
	});
});
