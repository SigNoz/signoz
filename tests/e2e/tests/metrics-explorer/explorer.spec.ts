import {
	allowFor,
	expect,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	test,
} from '../../drivers/metrics';

// The metrics query explorer against metrics this worker seeded. Switch, unit
// and empty-state logic are jest (Explorer/__tests__); the add-to-dashboard
// dialog wiring is ExplorerActions/__tests__. This spec keeps the round trips.

test.describe('Metrics explorer', () => {
	test.beforeEach(() => {
		allowFor(SEEDED_TEST_BUDGET);
	});

	test('TC-01 picking a metric and running plots real data (smoke)', async ({
		metricsExplorer: explorer,
		metricsCatalog: seed,
		noise,
	}) => {
		await explorer.goto();
		await explorer.pickMetric(seed.gauge);
		const response = await explorer.run();

		expect(response.ok()).toBe(true);
		expect(response.request().postData() ?? '').toContain(seed.gauge);
		await expect(explorer.firstChartCanvas()).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(explorer.noData()).toHaveCount(0);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 group by splits the legend into the seeded services', async ({
		metricsExplorer: explorer,
		metricsCatalog: seed,
	}) => {
		await explorer.goto();
		await explorer.pickMetric(seed.gauge);
		await explorer.groupBy('service.name');
		await explorer.run();

		await expect(async () => {
			const labels = await explorer.legendLabels();
			for (const service of seed.services) {
				expect(labels.some((label) => label.includes(service))).toBe(true);
			}
		}).toPass({ timeout: SEEDED_DATA_TIMEOUT });
	});

	test('TC-03 Add to Dashboard lands in the panel editor with the query, and saving puts the panel on the dashboard', async ({
		authedPage: page,
		metricsExplorer: explorer,
		metricsCatalog: seed,
	}) => {
		const { dashboards, panelEditor } = explorer;
		const dashboard = await dashboards.create(
			`e2e-mx-export-${seed.run}-${Date.now()}`,
		);

		try {
			await explorer.goto();
			await explorer.pickMetric(seed.gauge);
			await explorer.run();
			await explorer.addToDashboard(dashboard.title);

			await expect(page).toHaveURL(
				new RegExp(`/dashboard/${dashboard.id}/panel/`),
			);
			await expect(panelEditor.metricInput()).toHaveValue(seed.gauge);
			await expect(panelEditor.previewCanvas()).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});

			const ops = await panelEditor.save();
			expect(
				ops.some(
					(op) => op.op === 'add' && /^\/spec\/panels\/[^/]+$/.test(op.path),
				),
			).toBe(true);

			await expect.poll(() => dashboards.panelIds()).toHaveLength(1);
			const panels = Object.values(
				(await dashboards.getSpec(dashboard.id)).panels,
			);
			expect(panels).toHaveLength(1);
			expect(panels[0].spec.queries?.[0]).toMatchObject({
				spec: {
					plugin: {
						kind: 'signoz/CompositeQuery',
						spec: {
							queries: [
								{
									type: 'builder_query',
									spec: { aggregations: [{ metricName: seed.gauge }] },
								},
							],
						},
					},
				},
			});
		} finally {
			await dashboards.remove(dashboard.id);
		}
	});

	test('TC-04 Save view round trips through the views page', async ({
		authedPage: page,
		metricsExplorer: explorer,
		metricsCatalog: seed,
		savedViews,
	}) => {
		const prefix = `e2e-mx-view-${seed.run}`;
		const name = `${prefix}-${Date.now()}`;

		try {
			await explorer.goto();
			await explorer.pickMetric(seed.gauge);
			await explorer.run();
			await savedViews.saveAs(name);
			await expect(page).toHaveURL(/viewKey=/);

			await savedViews.gotoPage();
			await savedViews.search(name);
			await expect(savedViews.row(name)).toBeVisible();

			await savedViews.open(name);
			await expect(explorer.metricInput()).toHaveValue(seed.gauge);
			await expect(savedViews.select()).toContainText(name);
		} finally {
			await savedViews.removeByPrefix(prefix);
		}
	});

	test('TC-05 Create an Alert hands the query to the alert form', async ({
		metricsExplorer: explorer,
		metricsCatalog: seed,
	}) => {
		await explorer.goto();
		await explorer.pickMetric(seed.gauge);
		await explorer.run();
		await explorer.createAlert();

		expect(explorer.compositeQueryFromUrl()).toContain(seed.gauge);
		await expect(explorer.metricInput()).toHaveValue(seed.gauge, {
			timeout: SEEDED_DATA_TIMEOUT,
		});
	});
});
