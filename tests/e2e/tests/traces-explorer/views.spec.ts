import {
	expect,
	test,
	withoutParserNoise,
} from '../../drivers/traces-explorer';

test.describe('Traces explorer, views', () => {
	test('TC-01 list view renders seeded spans from the real backend', async ({
		traces,
		tracesExplorerSeed: seed,
		noise,
	}) => {
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.waitForRow(seed.rootSpanId);

		await expect(traces.cell(seed.rootSpanId, 'service.name')).toHaveText(
			seed.service,
		);
		await expect(traces.cell(seed.rootSpanId, 'name')).toHaveText('GET /orders');
		await expect(traces.cell(seed.rootSpanId, 'duration_nano')).toHaveText(/ms$/);
		await expect(
			traces.cell(seed.errorSpanId, 'response_status_code'),
		).toHaveText('500');

		expect(withoutParserNoise(noise.errors)).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 clicking a list row opens that span in trace details', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.waitForRow(seed.errorSpanId);

		await traces.openRow(seed.errorSpanId, seed.traceId);

		await expect(traces.traceDetailsRow(seed.errorSpanId)).toBeVisible();
	});

	test('TC-03 trace view lists the seeded trace with its span count', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.switchView('trace');

		await traces.waitForRow(seed.traceId);
		await expect(traces.table('trace')).toBeVisible();
		await expect(traces.cell(seed.traceId, 'span_count')).toHaveText(
			String(seed.traceSpanCount),
		);
		await expect(traces.cell(seed.traceId, 'service.name')).toHaveText(
			seed.service,
		);
	});

	test('TC-04 time series view draws a chart for the filter', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.switchView('timeseries');

		await expect(traces.timeSeriesGraph()).toBeVisible();
		await expect(traces.timeSeriesCanvas()).toBeVisible({
			timeout: 30_000,
		});
	});

	test('TC-05 table view shows the aggregated count', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.switchView('table');

		await expect(traces.tableCell(String(seed.spanCount))).toBeVisible({
			timeout: 30_000,
		});
	});

	test('TC-06 the chosen view survives a reload', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.switchView('table');
		await traces.reload();

		await expect(traces.viewButton('table')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await expect(traces.tableView()).toBeVisible();
	});

	test('TC-07 a deep-linked selectedExplorerView does not override a later view switch', async ({
		traces,
	}) => {
		// `getExplorerViewFromUrl` (utils/explorerUtils.ts) prefers
		// `selectedExplorerView` over `panelTypes`, and a view switch rewrites only
		// `panelTypes`, so the stale param wins on reload.
		test.fail(true, 'selectedExplorerView outranks panelTypes after a switch');

		await traces.goto({ selectedExplorerView: 'list' });
		await traces.switchView('table');
		await traces.reload();

		await expect(traces.viewButton('table')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
	});

	test('TC-08 the traces quick-filter rail offers the seeded service and narrows the list', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		await traces.goto();
		await traces.pickOnly('service.name', seed.service);

		await traces.waitForRow(seed.rootSpanId);
		await expect(async () => {
			const services = await traces.rowServices().allInnerTexts();
			expect(services.length).toBeGreaterThan(0);
			expect(new Set(services)).toEqual(new Set([seed.service]));
		}).toPass();
	});
});
