import {
	expect,
	OVERVIEW_PANELS,
	test,
	withoutMissingMetadata,
} from '../../drivers/apm';

test.describe('Services, list', () => {
	test('TC-01 services list shows a seeded service with trace-derived stats', async ({
		apm,
		apmSeed,
		noise,
	}) => {
		await apm.waitForService(apmSeed.service);

		expect(await apm.headers()).toEqual([
			'Application',
			'P99 latency (in ms)',
			'Error Rate (% of total)',
			'Operations Per Second',
		]);
		const cells = await apm.rowCells(apmSeed.service);
		expect(cells['Application']).toBe(apmSeed.service);
		expect(cells['Error Rate (% of total)']).toBe(apmSeed.errorRate);
		expect(Number(cells['P99 latency (in ms)'])).toBeGreaterThan(0);
		expect(Number(cells['Operations Per Second'])).toBeGreaterThan(0);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 service name opens the service overview', async ({
		apm,
		apmSeed,
		noise,
	}) => {
		await apm.waitForService(apmSeed.service);

		await apm.openService(apmSeed.service);

		await expect(apm.tab('Overview')).toHaveAttribute('aria-selected', 'true');
		for (const panel of OVERVIEW_PANELS) {
			// eslint-disable-next-line no-await-in-loop
			await apm.expectPanelRendered(panel);
		}
		const { errors, failedResponses } = withoutMissingMetadata(noise);
		expect(errors).toEqual([]);
		expect(failedResponses).toEqual([]);
	});
});
