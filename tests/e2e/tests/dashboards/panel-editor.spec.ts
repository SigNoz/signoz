import { expect, SEEDED_DATA_TIMEOUT, test } from '../../drivers/dashboards';

// The v2 panel editor's save round trips, over the golden `signoz_calls_total`.
// Section gating, op construction and variable payloads are covered by jest
// under `src/pages/DashboardPage/DashboardContainer/`.

const METRIC = 'signoz_calls_total';

const stamp = (area: string): string =>
	`e2e-panel-${area}-w${test.info().workerIndex}-${Date.now()}`;

test.describe('Panel editor', () => {
	test('TC-01 a new time-series panel built in the editor plots and persists', async ({
		authedPage: page,
		dashboards,
		panelEditor,
		noise,
	}) => {
		const seed = await dashboards.create(stamp('new'));

		try {
			await dashboards.goto(seed.id);
			await dashboards.addPanel('signoz/TimeSeriesPanel');
			await expect(panelEditor.root()).toBeVisible();

			await panelEditor.pickMetric(METRIC);
			const request = await panelEditor.run();
			expect(JSON.stringify(request.postDataJSON())).toContain(METRIC);
			await expect(panelEditor.previewCanvas()).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});

			await panelEditor.setTitle('Calls');
			const ops = await panelEditor.save();

			expect(ops.map((op) => op.path)).toContain('/spec/layouts/-');
			const added = ops.find((op) => /^\/spec\/panels\/[^/]+$/.test(op.path));
			expect(added, JSON.stringify(ops)).toBeDefined();
			const panelId = added!.path.split('/').pop()!;
			await expect(panelEditor.savedToast()).toBeVisible();

			const renderer = dashboards.panelRenderer(panelId, 'time-series');
			await expect(dashboards.panelTitle(panelId)).toHaveText('Calls');
			await expect(
				dashboards.panelRendererCanvas(panelId, 'time-series'),
			).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});

			await page.reload();
			await expect(dashboards.panelTitle(panelId)).toHaveText('Calls');
			await expect(renderer).toBeVisible();

			expect(noise.errors).toEqual([]);
			// An unpublished dashboard answers its public-config probe with 404.
			expect(
				noise.failedResponses.filter(
					(entry) => !/\/dashboards\/[^/]+\/public$/.test(entry),
				),
			).toEqual([]);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-02 a threshold saved in the editor persists in the spec and reopens in the editor', async ({
		authedPage: page,
		dashboards,
		panelEditor,
	}) => {
		const seed = await dashboards.createWithPanel(stamp('threshold'), {
			title: 'Thresholds',
			metricName: METRIC,
		});

		try {
			await dashboards.goto(seed.id);
			await dashboards.panelAction(seed.panelId, 'edit-panel');
			await expect(page).toHaveURL(new RegExp(`/panel/${seed.panelId}`));

			await panelEditor.openSection('Thresholds');
			await panelEditor.addThreshold({ value: 100, label: 'hi' });
			const ops = await panelEditor.save();

			expect(ops.map((op) => op.path)).toEqual([
				`/spec/panels/${seed.panelId}/spec`,
			]);
			const spec = await dashboards.getSpec(seed.id);
			expect(spec.panels[seed.panelId].spec.plugin).toMatchObject({
				spec: { thresholds: [{ value: 100, label: 'hi' }] },
			});

			await dashboards.panelAction(seed.panelId, 'edit-panel');
			await expect(panelEditor.thresholdEdit(0)).toBeVisible();
			await panelEditor.thresholdEdit(0).click();
			await expect(panelEditor.thresholdValue(0)).toHaveValue('100');
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-03 switching the type to Area with percent stacking renders and persists', async ({
		dashboards,
		panelEditor,
	}) => {
		const seed = await dashboards.createWithPanel(stamp('area'), {
			title: 'Area',
			metricName: METRIC,
		});

		try {
			await dashboards.goto(seed.id);
			await dashboards.panelAction(seed.panelId, 'edit-panel');
			await expect(panelEditor.root()).toBeVisible();

			await panelEditor.setType('Area Chart');
			await expect(panelEditor.previewRenderer('area-chart')).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
			await panelEditor.openSection('Visualization');
			await panelEditor.setStackMode('percent');
			await panelEditor.save();

			const plugin = (await dashboards.getSpec(seed.id)).panels[seed.panelId].spec
				.plugin;
			expect(plugin).toMatchObject({
				kind: 'signoz/AreaChartPanel',
				spec: { visualization: { stack: 'percent' } },
			});
			await expect(
				dashboards.panelRenderer(seed.panelId, 'area-chart'),
			).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-04 a bar panel with stacked series persists', async ({
		dashboards,
		panelEditor,
	}) => {
		const seed = await dashboards.createWithPanel(stamp('bar'), {
			kind: 'signoz/BarChartPanel',
			title: 'Bars',
			metricName: METRIC,
		});

		try {
			await dashboards.goto(seed.id);
			await dashboards.panelAction(seed.panelId, 'edit-panel');
			await expect(panelEditor.root()).toBeVisible();

			await panelEditor.openSection('Visualization');
			await panelEditor.setStackedBar(true);
			await panelEditor.save();

			const plugin = (await dashboards.getSpec(seed.id)).panels[seed.panelId].spec
				.plugin;
			expect(plugin).toMatchObject({
				spec: { visualization: { stackedBarChart: true } },
			});
			await expect(
				dashboards.panelRenderer(seed.panelId, 'bar-panel'),
			).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test("TC-05 a dashboard variable value reaches the panel's query_range", async ({
		dashboards,
	}) => {
		const seed = await dashboards.createWithVariable(
			stamp('variable'),
			{ name: 'operation', values: '/cart/get,/cart/add' },
			{ title: 'By operation', metricName: METRIC },
		);

		try {
			await dashboards.goto(seed.id);
			await expect(dashboards.variableSelect('operation')).toBeVisible();

			const request = dashboards.nextQueryWithVariable('operation', '/cart/add');
			await dashboards.pickVariable('operation', '/cart/add');
			await request;

			await expect(dashboards.panelCanvas(seed.panelId)).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
			await expect(dashboards.panelError(seed.panelId)).toHaveCount(0);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-06 a custom variable created in the editor persists and appears in the bar', async ({
		authedPage: page,
		dashboards,
		panelEditor,
	}) => {
		const seed = await dashboards.create(stamp('new-variable'));

		try {
			await dashboards.goto(seed.id);
			await panelEditor.variables.open();
			const ops = await panelEditor.variables.create({
				name: 'env',
				values: 'prod,dev',
			});
			expect(ops.map((op) => op.path)).toEqual(['/spec/variables']);

			await page.reload();
			const select = dashboards.variableSelect('env');
			await expect(select).toBeVisible();
			await select.click();
			const options = dashboards.variableOptions();
			await expect(options.filter({ hasText: 'prod' })).toBeVisible();
			await expect(options.filter({ hasText: 'dev' })).toBeVisible();
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-07 clone and delete from the panel menu round-trip through the API', async ({
		dashboards,
	}) => {
		const seed = await dashboards.createWithPanel(stamp('clone'), {
			title: 'Original',
			metricName: METRIC,
		});
		try {
			await dashboards.goto(seed.id);

			await dashboards.patched(() =>
				dashboards.panelAction(seed.panelId, 'clone-panel'),
			);
			await expect(async () => {
				expect(await dashboards.panelIds()).toHaveLength(2);
			}).toPass({ timeout: 10_000 });
			expect(Object.keys((await dashboards.getSpec(seed.id)).panels)).toHaveLength(
				2,
			);

			const cloneId = (await dashboards.panelIds()).find(
				(id) => id !== seed.panelId,
			)!;
			await dashboards.panelAction(cloneId, 'delete-panel');
			await dashboards.patched(() => dashboards.confirmDeleteButton().click());

			await expect(async () => {
				expect(await dashboards.panelIds()).toEqual([seed.panelId]);
			}).toPass({ timeout: 10_000 });
			expect(Object.keys((await dashboards.getSpec(seed.id)).panels)).toEqual([
				seed.panelId,
			]);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-08 View opens the panel modal with real data', async ({
		authedPage: page,
		dashboards,
	}) => {
		const seed = await dashboards.createWithPanel(stamp('view'), {
			title: 'Viewed',
			metricName: METRIC,
		});

		try {
			await dashboards.goto(seed.id);
			await dashboards.panelAction(seed.panelId, 'view-panel');

			await expect(dashboards.viewPanel.typeSelector()).toBeVisible();
			await expect(dashboards.viewPanel.canvas()).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});

			await dashboards.viewPanel.switchToEdit().click();
			await expect(page).toHaveURL(new RegExp(`/panel/${seed.panelId}`));
		} finally {
			await dashboards.remove(seed.id);
		}
	});
});
