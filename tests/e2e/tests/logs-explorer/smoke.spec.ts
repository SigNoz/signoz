import { expect, serviceFilter, test } from '../../drivers/logs';

test.describe('Logs Explorer — smoke', () => {
	test('TC-01 the explorer lists the seeded logs', async ({
		logs,
		logsSeed,
		noise,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});

		await logs.showFrequencyChart();
		await expect(logs.frequencyChart()).toBeVisible();
		await expect(
			logs.listRows().filter({ hasNotText: logsSeed.marker }),
		).toHaveCount(0);
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 every list format renders the seeded rows', async ({
		logs,
		logsSeed,
		noise,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});

		for (const format of ['Raw', 'Default', 'Column'] as const) {
			// eslint-disable-next-line no-await-in-loop
			await logs.setFormat(format);
			// eslint-disable-next-line no-await-in-loop
			await expect(logs.rowByBody(logsSeed.recent[0])).toBeVisible();
		}
		await expect
			.poll(() => logs.table.headers())
			.toEqual(expect.arrayContaining(['Timestamp', 'Body']));
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-03 the table view counts the seeded rows', async ({
		logs,
		logsSeed,
		noise,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.switchView('Table');

		await expect(logs.queryTableRows()).toHaveCount(1);
		await expect(logs.queryTableRows().first()).toContainText(
			String(logsSeed.total),
		);
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-04 the time series view draws the seeded series', async ({
		logs,
		logsSeed,
		noise,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.switchView('Time Series');

		await expect(logs.timeSeriesHeader()).toBeVisible();
		await expect(logs.timeSeriesGraph()).toBeVisible();
		await expect(logs.timeSeriesCanvas()).toBeVisible();
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-05 the views list, the pipelines tab and the index-fields page load', async ({
		logs,
		pipelines,
		views,
		noise,
	}) => {
		await logs.goto();
		await views.openList();

		await logs.openTab('Pipelines');
		await expect(
			pipelines.newPipelineButton().or(pipelines.editModeButton()),
		).toBeVisible();

		await logs.gotoIndexFields();
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});
});
