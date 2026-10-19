import { expect, test } from '../../drivers/meter';

// The cost meter on a stack with no meter data: nothing writes
// `signoz_meter.*` here, so these are empty-state smokes. The short-window
// notice, the billing notice and the hidden Create Alert / Add to Dashboard
// buttons are jest candidates.

test.describe('Meter', () => {
	test('TC-01 the breakdown page renders its sections with no data (smoke)', async ({
		meter,
		noise,
	}) => {
		const responses = await meter.breakdown.goto();

		for (const section of ['total', 'logs', 'traces', 'metrics'] as const) {
			await expect(meter.breakdown.section(section)).toBeVisible();
		}
		expect(responses.filter((res) => !res.ok()).map((res) => res.url())).toEqual(
			[],
		);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 the meter explorer shows the pre-query empty state and an empty metric list', async ({
		meter,
	}) => {
		const { explorer } = meter;
		const listed = meter.nextMetricList();
		await explorer.goto();

		expect((await listed).ok()).toBe(true);
		await expect(explorer.emptyState()).toBeVisible();
		await expect(await explorer.openMetricOptions()).toHaveCount(0);
		await expect(explorer.createAlertButton()).toHaveCount(0);
		await expect(explorer.addToDashboardButton()).toHaveCount(0);
	});

	test('TC-03 a seeded meter view is listed and opens the meter explorer', async ({
		authedPage: page,
		meter,
	}) => {
		const { views } = meter;
		const prefix = `e2e-meter-view-${Date.now()}`;
		const name = `${prefix}-a`;
		await views.create(name, {
			expression: '',
			panelType: 'graph',
			spec: {
				aggregations: [
					{
						metricName: 'signoz.meter.log.size',
						timeAggregation: 'increase',
						spaceAggregation: 'sum',
					},
				],
			},
		});

		try {
			await views.gotoPage();
			await views.search(name);
			await expect(views.row(name)).toBeVisible();

			await views.open(name);
			await expect(page).toHaveURL(/\/meter\/explorer\?/);
		} finally {
			await views.removeByPrefix(prefix);
		}
	});
});
