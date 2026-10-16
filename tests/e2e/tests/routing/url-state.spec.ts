import { expect, PATH, test } from '../../drivers/routing';

// The nuqs adapter swap. On the k8s list `groupBy` is written by nuqs straight
// to the History API with `history: 'push'`, while `relativeTime` is written by
// the router through `useSafeNavigate`.

test.describe('Routing — nuqs and router param coexistence', () => {
	test('TC-01 a router write keeps the nuqs params it did not author', async ({
		routing,
		pods,
	}) => {
		await routing.k8s.goto({ relativeTime: '30m' });

		await routing.k8s.groupBy(pods.groupBy);
		await routing.selectRelativeTime('1h');
		await routing.waitForParam('relativeTime', '1h');

		expect(routing.url().pathname).toBe(PATH.k8s);
		expect(routing.params()).toMatchObject({
			relativeTime: '1h',
			category: 'pods',
		});
		expect(routing.params().groupBy).toContain(pods.groupBy);
		await expect(routing.k8s.groupBySelect()).toContainText(pods.groupBy);
	});

	test('TC-02 a nuqs write keeps the relativeTime the router authored', async ({
		routing,
		pods,
	}) => {
		await routing.k8s.goto({ relativeTime: '30m' });

		await routing.selectRelativeTime('6h');
		await routing.waitForParam('relativeTime', '6h');

		await routing.k8s.groupBy(pods.groupBy);

		expect(routing.url().pathname).toBe(PATH.k8s);
		expect(routing.params().relativeTime).toBe('6h');
		expect(routing.params().groupBy).toContain(pods.groupBy);
		await routing.expectRelativeTime('6h');
	});

	test('TC-03 POP across a nuqs push reverts both url and list', async ({
		routing,
		pods,
	}) => {
		await routing.k8s.goto({ relativeTime: '30m' });

		// One flush, one entry: otherwise one Back lands on an intermediate url.
		const depthBeforeGroupBy = await routing.historyDepth();
		await routing.k8s.groupBy(pods.groupBy);
		expect(await routing.historyDepth()).toBe(depthBeforeGroupBy + 1);
		await expect(routing.k8s.groupBySelect()).toContainText(pods.groupBy);

		await routing.goBack();
		await routing.k8s.waitUntilGrouped(pods.groupBy, false);
		expect(routing.url().pathname).toBe(PATH.k8s);
		await expect(routing.k8s.groupBySelect()).not.toContainText(pods.groupBy);

		await routing.goForward();
		await routing.k8s.waitUntilGrouped(pods.groupBy);
		await expect(routing.k8s.groupBySelect()).toContainText(pods.groupBy);
	});

	test('TC-04 a deep link carrying both families applies both on first paint', async ({
		routing,
		pods,
	}) => {
		await routing.k8s.goto({
			relativeTime: '6h',
			groupBy: JSON.stringify([pods.groupBy]),
		});

		// `k8s.goto` waited for the mount-time republish, so anything it dropped is
		// missing by now.
		expect(routing.url().pathname).toBe(PATH.k8s);
		expect(routing.params().relativeTime).toBe('6h');
		expect(routing.params().groupBy).toContain(pods.groupBy);
		await routing.expectRelativeTime('6h');
		await expect(routing.k8s.groupBySelect()).toContainText(pods.groupBy);
	});
});
