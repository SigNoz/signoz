import {
	allowFor,
	expect,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	test,
} from '../../drivers/metrics';

// The summary tab against metrics this worker seeded. Loading, error and empty
// states, and the table's own callbacks, are jest (Summary/__tests__); what is
// left is a real stats/treemap/metadata response reaching the DOM.

test.describe('Metrics explorer summary', () => {
	test.beforeEach(() => {
		allowFor(SEEDED_TEST_BUDGET);
	});

	test('TC-01 summary loads seeded metrics in the list and treemap, with no console noise', async ({
		metrics,
		metricsCatalog: seed,
		noise,
	}) => {
		await metrics.gotoSummary();
		const stats = metrics.nextStatsRequest(
			(body) => body.filter?.expression === seed.scope,
		);
		await metrics.scopeTo(seed.scope);
		expect((await stats).filter?.expression).toBe(seed.scope);
		await metrics.waitForRows([seed.gauge, seed.sum]);

		await expect(metrics.cell(seed.gauge, 'TYPE')).toHaveText('Gauge');
		await expect(metrics.cell(seed.gauge, 'UNIT')).toHaveText('Bytes (B)');
		await expect(metrics.cell(seed.gauge, 'DESCRIPTION')).toHaveText('e2e gauge');
		await expect(metrics.cell(seed.gauge, 'TIME SERIES')).toHaveText('3');
		await expect(metrics.cell(seed.sum, 'TYPE')).toHaveText('Sum');
		await expect(metrics.cell(seed.sum, 'DESCRIPTION')).toHaveText('-');

		await expect(metrics.treemap()).toBeVisible();
		for (const tab of ['Summary', 'Explorer', 'Views'] as const) {
			await expect(metrics.tab(tab)).toBeVisible();
		}

		// Known defect: parser/analyzeQuery.ts keeps antlr's default console
		// listener, so each half-typed expression logs `line 1:N ...`.
		expect(noise.errors.filter((e) => !/^line \d+:\d+ /.test(e))).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a resource-attribute filter narrows the list through the API', async ({
		metrics,
		metricsCatalog: seed,
	}) => {
		const expression = `service.name = '${seed.services[0]}'`;
		await metrics.gotoSummary();
		const stats = metrics.nextStatsRequest(
			(body) => body.filter?.expression === expression,
		);
		await metrics.scopeTo(expression);

		expect((await stats).filter?.expression).toBe(expression);
		await metrics.waitForRows([seed.gauge]);
		await expect(metrics.row(seed.sum)).toHaveCount(0);
		await metrics.search().expectExpression(expression);
	});

	test('TC-03 sort and page size reach the stats request', async ({
		authedPage: page,
		metrics,
		metricsCatalog: seed,
	}) => {
		const names = [seed.gauge, seed.sum];
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.waitForRows(names);

		// antd cycles an unsorted column to ascend first, then descend.
		const ascending = metrics.nextStatsRequest(
			(body) =>
				body.orderBy?.key?.name === 'timeseries' &&
				body.orderBy.direction === 'asc',
		);
		await metrics.sortBy('TIME SERIES');
		await ascending;
		await expect
			.poll(() => metrics.rowOrder(names))
			.toEqual([seed.sum, seed.gauge]);

		const descending = metrics.nextStatsRequest(
			(body) =>
				body.orderBy?.key?.name === 'timeseries' &&
				body.orderBy.direction === 'desc',
		);
		await metrics.sortBy('TIME SERIES');
		await descending;
		await expect
			.poll(() => metrics.rowOrder(names))
			.toEqual([seed.gauge, seed.sum]);

		const resized = metrics.nextStatsRequest((body) => body.limit === 20);
		await metrics.setPageSize(20);
		expect((await resized).offset).toBe(0);

		await page.reload();
		expect(await metrics.storedPageSize()).toBe(20);
	});

	test('TC-04 a row opens the details drawer with real highlights and attributes, and a deep link restores it', async ({
		authedPage: page,
		metrics,
		metricsCatalog: seed,
	}) => {
		const { details } = metrics;
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.openDetails(seed.gauge);

		await expect(details.timeSeries()).toContainText('3 total');
		await expect(details.lastReceived()).not.toHaveText('-');
		await expect(details.attributeKey('host')).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(details.attributeKey('service.name')).toBeVisible();
		await expect(details.attributeValue('host', 'h1')).toBeVisible();

		await details.attributesSearch('host');
		await expect(details.attributeKey('service.name')).toHaveCount(0);
		await expect(details.attributeKey('host')).toBeVisible();

		await expect(page).toHaveURL(/isMetricDetailsOpen=true/);
		expect(new URL(page.url()).searchParams.get('selectedMetricName')).toBe(
			seed.gauge,
		);

		await page.reload();
		await expect(details.title()).toHaveText(seed.gauge);

		await metrics.closeDetails();
	});

	test('TC-05 editing metadata persists across a reload', async ({
		authedPage: page,
		metrics,
	}) => {
		const { metadata } = metrics;
		const seeded = await metrics.seedMetric({
			prefix: 'e2e_mx_meta',
			type: 'Sum',
			temporality: 'Cumulative',
		});
		await metrics.gotoSummary();
		await metrics.scopeTo(seeded.scope);
		await metrics.waitForRows([seeded.name]);
		await metrics.openDetails(seeded.name);

		await metadata.edit();
		await metadata.setDescription('e2e edited');
		await metadata.setUnit('Bytes (B)');
		await metadata.setTemporality('Delta');
		const saved = await metadata.save();

		expect(saved.response.ok()).toBe(true);
		expect(saved.body).toMatchObject({
			metricName: seeded.name,
			description: 'e2e edited',
			unit: 'By',
			temporality: 'delta',
		});
		await expect(metrics.toast('Metadata updated successfully')).toBeVisible();

		await page.reload();
		await expect(metadata.value('description')).toHaveText('e2e edited');
		expect((await metrics.metadataFromApi(seeded.name)).description).toBe(
			'e2e edited',
		);

		await metrics.closeDetails();
		await metrics.search().run();
		await expect(metrics.cell(seeded.name, 'DESCRIPTION')).toHaveText(
			'e2e edited',
		);
	});

	test('TC-06 a backend validation error surfaces in the toast and keeps edit mode', async ({
		metrics,
	}) => {
		const { metadata } = metrics;
		const seeded = await metrics.seedMetric({
			prefix: 'e2e_mx_invalid',
			type: 'Sum',
			temporality: 'Unspecified',
		});
		await metrics.gotoSummary();
		await metrics.scopeTo(seeded.scope);
		await metrics.waitForRows([seeded.name]);
		await metrics.openDetails(seeded.name);

		await metadata.edit();
		await metadata.setDescription('e2e rejected');
		const saved = await metadata.save();

		expect(saved.response.status()).toBe(400);
		await expect(metrics.toast(/temporality/)).toBeVisible();
		await expect(metadata.saveButton()).toBeVisible();
		expect((await metrics.metadataFromApi(seeded.name)).description).not.toBe(
			'e2e rejected',
		);
	});

	test('TC-07 Open in Explorer carries the metric into the explorer and plots it', async ({
		metrics,
		metricsExplorer,
		metricsCatalog: seed,
	}) => {
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.openDetails(seed.gauge);

		const plotted = metricsExplorer.nextQueryFor(seed.gauge);
		await metrics.details.openInExplorer();

		expect((await plotted).ok()).toBe(true);
		await expect(metricsExplorer.metricInput()).toHaveValue(seed.gauge);
		await expect(metricsExplorer.firstChartCanvas()).toBeVisible();
	});

	test('TC-08 Inspect a gauge shows its real series', async ({
		authedPage: page,
		metrics,
		metricsCatalog: seed,
	}) => {
		const inspect = metrics.inspectDrawer;
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.openDetails(seed.gauge);
		await metrics.details.inspect();

		await expect(inspect.seriesCount()).toHaveText('3 time series', {
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(inspect.empty()).toHaveCount(0);
		await expect(page).toHaveURL(/isInspectModalOpen=true/);

		await inspect.toggleView();
		await expect(inspect.viewLabel('Table View')).toBeVisible();
	});

	// The stats and treemap APIs drop every `signoz*` metric, so the golden
	// dataset never reaches the treemap; the scoped seed does.
	test('TC-09 treemap mode switch and tile click', async ({
		metrics,
		metricsCatalog: seed,
	}) => {
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.waitForRows([seed.gauge]);

		const treemap = metrics.nextTreemapRequest(
			(body) =>
				body.mode === 'timeseries' && body.filter?.expression === seed.scope,
		);
		await metrics.setTreemapMode('Time Series');
		expect((await treemap).mode).toBe('timeseries');

		await expect(metrics.tile(seed.gauge)).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await metrics.tile(seed.gauge).click();
		await expect(metrics.details.title()).toHaveText(seed.gauge);
	});

	test('TC-10 the METRIC column search adds a CONTAINS filter', async ({
		metrics,
		metricsCatalog: seed,
	}) => {
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.waitForRows([seed.gauge, seed.sum]);

		await metrics.searchMetricName(seed.gauge);

		await metrics.search().expectContains('metric_name contains');
		await metrics.search().expectContains(seed.gauge);
		await expect(metrics.row(seed.gauge)).toBeVisible();
		await expect(metrics.row(seed.sum)).toHaveCount(0);
	});
});
