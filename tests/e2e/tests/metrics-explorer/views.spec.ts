import { expect, test } from '../../drivers/metrics';

// The metrics explorer's views list over views seeded through the API. Search,
// edit and delete component behaviour is jest (container/SavedViews/__tests__);
// the API lifecycle is tests/integration/tests/savedview. This spec keeps one
// real round trip.

const gaugeAverage = (metricName: string): Record<string, unknown> => ({
	aggregations: [
		{ metricName, timeAggregation: 'avg', spaceAggregation: 'avg' },
	],
});

test.describe('Metrics explorer views', () => {
	test('TC-01 the views list shows a seeded view (smoke)', async ({
		metricsExplorer: explorer,
		metricsCatalog: seed,
		savedViews,
		noise,
	}) => {
		const prefix = `e2e-mx-views-${seed.run}-list`;
		const name = `${prefix}-${Date.now()}`;
		await savedViews.create(name, {
			expression: seed.scope,
			panelType: 'graph',
			spec: gaugeAverage(seed.gauge),
		});

		try {
			await explorer.goto();
			await savedViews.search(name);
			await expect(savedViews.row(name)).toBeVisible();

			await savedViews.search(`${name}-no-such-view`);
			await expect(savedViews.row(name)).toHaveCount(0);

			expect(noise.errors).toEqual([]);
			expect(noise.failedResponses).toEqual([]);
		} finally {
			await savedViews.removeByPrefix(prefix);
		}
	});

	test('TC-02 rename and delete persist through the API', async ({
		authedPage: page,
		metricsExplorer: explorer,
		metricsCatalog: seed,
		savedViews,
	}) => {
		const prefix = `e2e-mx-views-${seed.run}-edit`;
		const name = `${prefix}-${Date.now()}`;
		const renamed = `${name}-renamed`;
		const id = await savedViews.create(name, {
			expression: seed.scope,
			panelType: 'graph',
			spec: gaugeAverage(seed.gauge),
		});

		try {
			await explorer.goto();
			await savedViews.search(name);
			await savedViews.rename(name, renamed);

			await page.reload();
			await savedViews.search(renamed);
			await expect(savedViews.row(renamed)).toBeVisible();

			await savedViews.remove(renamed);
			expect((await savedViews.list()).map((view) => view.id)).not.toContain(id);
		} finally {
			await savedViews.removeByPrefix(prefix);
		}
	});
});
