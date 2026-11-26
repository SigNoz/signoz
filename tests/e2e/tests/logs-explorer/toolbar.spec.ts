import {
	expect,
	lineBody,
	serviceFilter,
	sideService,
	test,
} from '../../drivers/logs';

const OLD_OFFSET_MS = -60 * 60_000;
const FRESH_OFFSET_MS = -60_000;

test.describe('Logs Explorer — toolbar', () => {
	test('TC-01 Run query applies a typed expression and narrows the list', async ({
		logs,
		logsSeed,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});

		const expression = `${serviceFilter(logsSeed.service)} AND e2e.kind = 'odd'`;
		await logs.search.apply(expression);

		expect(logs.search.read()).toBe(expression);
		await expect(logs.rowByBody(lineBody(logsSeed.marker, 23))).toBeVisible();
		await expect(logs.rowByBody(logsSeed.recent[0])).toHaveCount(0);
		await expect(logs.rowByBody(logsSeed.old)).toHaveCount(0);
		await expect
			.poll(() => logs.visibleTokens(logsSeed.marker))
			.not.toContainEqual(expect.stringMatching(/line-\d[02468]$/));
	});

	test('TC-02 the time picker window reaches the query', async ({
		logs,
		logsSeed,
	}) => {
		// A service of its own: the worker's rows age with the worker, and a
		// 15 minute window needs rows stamped now.
		const service = sideService(logsSeed, `tp-${Date.now()}`);
		const fresh = `${service} fresh`;
		const old = `${service} old`;
		await logs.seedRow(service, fresh, FRESH_OFFSET_MS);
		await logs.seedRow(service, old, OLD_OFFSET_MS);

		await logs.gotoUntil(fresh, {
			expression: serviceFilter(service),
			relativeTime: '6h',
		});
		await expect(logs.rowByBody(old)).toBeVisible();

		await logs.setTimeRange('15m');

		await expect(logs.rowByBody(old)).toHaveCount(0);
		await expect(logs.rowByBody(fresh)).toBeVisible();
	});

	test('TC-03 order by timestamp ascending reverses the rows', async ({
		logs,
		logsSeed,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.setFormat('Column');
		await expect
			.poll(async () => (await logs.visibleTokens(logsSeed.marker))[0])
			.toBe('json');

		await logs.setOrderBy('timestamp (asc)');

		await expect
			.poll(async () => (await logs.visibleTokens(logsSeed.marker)).slice(0, 2))
			.toEqual(['old', 'line-00']);
	});

	test('TC-04 scrolling past a page loads the next one without duplicates', async ({
		logs,
		logsSeed,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
			pageSize: 10,
		});
		await logs.setFormat('Column');

		const keys = await logs.collectRowKeys(logsSeed.total);

		expect(keys).toHaveLength(logsSeed.total);
	});
});
