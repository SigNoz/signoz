import { expect, EXPLORER, test } from '../../drivers/query-builder';
import {
	holdQueryRange,
	mockQueryRange,
	mockQueryRangeError,
	QueryRange,
	unmockQueryRange,
} from '../../helpers/query-range-mock';

test.describe('Query builder — run and cancel', () => {
	test('TC-34 a held run can be cancelled and the next run goes through', async ({
		authedPage: page,
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		const held = await holdQueryRange(page, QueryRange.empty());
		await qb.query('A').filter.type("severity_text = 'WARN'");
		await qb.query('A').filter.press('Escape');

		await qb.runButton().click();
		await expect(qb.runButton()).toHaveText('Cancel');
		await qb.runButton().click();
		await expect(qb.runButton()).toHaveText(/Run Query/);
		await expect(qb.logsResults()).toContainText('Query cancelled');

		held.release();
		await unmockQueryRange(page);
		await qb.query('A').filter.type("severity_text = 'ERROR'");
		await qb.query('A').filter.press('Escape');
		// The cancelled query is re-sent alongside; the newest request wins.
		await qb.run();
		expect(qb.latest('A')?.filter?.expression).toBe("severity_text = 'ERROR'");
		await expect(qb.logsResults()).not.toContainText('Query cancelled');
	});

	test('TC-35 a failed run keeps the query editable and the next run recovers', async ({
		authedPage: page,
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		await mockQueryRangeError(page, 'mocked query failure');
		await qb.query('A').filter.type("severity_text = 'INFO'");
		await qb.query('A').filter.press('Escape');

		await qb.runButton().click();
		// The failed request is retried before the error settles.
		await expect(qb.runButton()).toHaveText(/Run Query/, { timeout: 20_000 });
		await expect(qb.logsResults()).toContainText('mocked query failure');
		await expect
			.poll(() => qb.query('A').filter.expression())
			.toBe("severity_text = 'INFO'");

		await unmockQueryRange(page);
		await qb.query('A').filter.type("severity_text = 'WARN'");
		await qb.query('A').filter.press('Escape');
		const fired = await qb.run();
		expect(qb.spec(fired, 'A').filter?.expression).toBe("severity_text = 'WARN'");
		await expect(qb.logsResults()).not.toContainText('mocked query failure');
	});

	test('TC-35 an empty result leaves the query unchanged', async ({
		authedPage: page,
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		await mockQueryRange(page, QueryRange.empty());
		await qb.query('A').filter.type("service.name = 'nothing-here'");
		await qb.query('A').filter.press('Escape');

		const fired = await qb.run();

		expect(qb.spec(fired, 'A').filter?.expression).toBe(
			"service.name = 'nothing-here'",
		);
		await expect
			.poll(() => qb.query('A').filter.expression())
			.toBe("service.name = 'nothing-here'");
		expect(qb.console.errors).toEqual([]);
	});
});
