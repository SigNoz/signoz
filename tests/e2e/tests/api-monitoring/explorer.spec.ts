import { expect, test } from '../../drivers/api-monitoring';

const DOMAIN_HEADERS = [
	'Domain',
	'Endpoints in use',
	'Last used',
	'Rate ops/s',
	'Error %',
	'Avg. Latency ms',
];

const METRIC_LABELS = [
	'EXTERNAL API',
	'AVERAGE LATENCY',
	'ERROR %',
	'LAST USED',
];

test.describe('API monitoring, explorer', () => {
	test('TC-01 domain list shows the seeded external host', async ({
		apiMonitoring,
		apiSeed,
		noise,
	}) => {
		await apiMonitoring.goto();
		await apiMonitoring.waitForDomain(apiSeed.host);

		expect(await apiMonitoring.headers()).toEqual(DOMAIN_HEADERS);
		await expect(
			await apiMonitoring.domainCell(apiSeed.host, 'Endpoints in use'),
		).toHaveText('2');
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 the domain drawer opens with metrics and all three views render', async ({
		apiMonitoring,
		apiSeed,
	}) => {
		await apiMonitoring.goto();
		await apiMonitoring.waitForDomain(apiSeed.host);
		await apiMonitoring.openDomain(apiSeed.host);

		const { drawer } = apiMonitoring;
		for (const label of METRIC_LABELS) {
			await expect(drawer.metrics()).toContainText(label);
		}
		await expect(async () => {
			const values = await drawer.metricValues();
			expect(values).toHaveLength(METRIC_LABELS.length);
			expect(values[0]).toBe(String(apiSeed.callCount));
			expect(values).not.toContain('-');
		}).toPass();

		await drawer.view('all_endpoints');
		await expect(drawer.root()).toContainText('/v1/items');
		await drawer.view('endpoint_stats');
		await expect(drawer.statusCodeTable()).toBeVisible();
		await drawer.view('top_errors');
		await expect(drawer.topErrorsTable()).toBeVisible();
	});

	test('TC-03 top errors lists the seeded failing endpoint', async ({
		apiMonitoring,
		apiSeed,
	}) => {
		await apiMonitoring.gotoDomain(apiSeed.host, 'top_errors');

		const row = apiMonitoring.drawer.topErrorRow(apiSeed.endpoints.items);
		await expect(row).toHaveCount(1);
		await expect(row).toContainText(String(apiSeed.errorStatus));
		await expect(row).toContainText(apiSeed.errorMessage);
		await expect(
			apiMonitoring.drawer.topErrorCount(apiSeed.endpoints.items),
		).toHaveText('1');
	});

	test('TC-04 endpoint stats shows dependent caller services', async ({
		apiMonitoring,
		apiSeed,
	}) => {
		await apiMonitoring.gotoDomain(apiSeed.host, 'endpoint_stats', {
			endpoint: apiSeed.endpoints.items,
		});

		const { drawer } = apiMonitoring;
		await expect(drawer.dependentServices()).toContainText(
			apiSeed.callers.orders,
		);
		await expect(drawer.dependentServices()).not.toContainText(
			apiSeed.callers.billing,
		);
		for (const code of ['200', String(apiSeed.errorStatus)]) {
			await expect(drawer.statusCodeCell(code)).toHaveCount(1);
		}
	});
});
