import { expect, SEEDED_DATA_TIMEOUT, test } from '../../drivers/logs';

test.describe('Logs Explorer — quick filters rail', () => {
	test('TC-01 picking a service in the rail narrows the list and writes the expression', async ({
		logs,
		logsRail,
		logsSeed,
	}) => {
		await logsRail.ensureSeeded();
		await logs.goto();

		await logsRail.only('service.name', logsSeed.service);

		await logs.search.expectContains(logsSeed.service);
		await expect(logs.rowByBody(logsSeed.recent[0])).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(
			logs.listRows().filter({ hasNotText: logsSeed.marker }),
		).toHaveCount(0);
	});
});
