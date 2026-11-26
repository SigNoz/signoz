import {
	expect,
	GOLDEN,
	logsCountQuery,
	PanelKind,
	PATH,
	QueryTab,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-editor';

// Scope: the query pane and its commit semantics.
//
// The rule worth pinning: editing the builder does NOT move the preview (only
// Run, or a structural change, commits into the draft) — but Save serialises
// the LIVE query anyway, so an unrun edit still persists. Contradictory-looking
// and easy to "fix" into a regression.

test.describe('Dashboards — panel editor query pane', () => {
	test('TC-01 Run Query issues a fresh query_range', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toBeVisible();

		await editor.query.run();
	});

	test('TC-02 the run keyboard shortcut works from inside the builder', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toBeVisible();

		// Bound with onKeyDownCapture, so it fires from inside inputs too.
		await editor.query.runShortcut();
	});

	test('TC-03 switching query type re-renders the pane and marks the panel dirty', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.unsavedBadge()).toHaveCount(0);

		await editor.query.tab(QueryTab.promql).click();
		await expect(editor.query.tab(QueryTab.promql)).toHaveAttribute(
			'aria-selected',
			'true',
		);

		// Structural change: auto-commits without Run.
		await expect(editor.unsavedBadge()).toBeVisible();
	});

	test('TC-04 choosing a metric makes a new panel savable', async ({
		authedPage: page,
		dashboards,
		editor,
		newPanel,
	}) => {
		// create → configure → save. A new metrics panel seeds an empty
		// aggregation and is rejected until a metric is picked (picker TC-07).
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		await dashboards.headerAddPanel().click();
		await newPanel.choose(PanelKind.TimeSeries);
		await expect(editor.root()).toBeVisible();

		await editor.query.selectMetric(GOLDEN.metrics.calls);
		await editor.title().fill('Configured then saved');
		await editor.save();

		await page.waitForURL(PATH.onDashboard(id));

		const after = await dashboards.get(id);
		const saved = Object.values(after.spec.panels).find(
			(candidate) => candidate.spec.display.name === 'Configured then saved',
		);
		expect(saved).toBeDefined();
		expect(JSON.stringify(saved?.spec.queries)).toContain(GOLDEN.metrics.calls);
	});

	test('TC-05 an unrun query edit is still persisted by Save', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		// No Run: `buildSaveSpec` serialises the live query, so the edit must
		// survive — otherwise saving without running loses work.
		await editor.query.selectMetric(GOLDEN.metrics.latencyCount);
		await editor.save();

		await expect
			.poll(async () => {
				const after = await dashboards.get(id);
				return JSON.stringify(
					after.spec.panels[SINGLE_PANEL_ID].spec.queries,
				).includes(GOLDEN.metrics.latencyCount);
			})
			.toBe(true);
	});

	test('TC-06 the in-editor query survives a reload', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await editor.query.selectMetric(GOLDEN.metrics.latencySum);
		await editor.query.run();

		// No forceReset, so the URL query wins and survives a refresh.
		await dashboards.reload();
		await expect(editor.root()).toBeVisible();
		await expect(editor.query.metricInput()).toHaveValue(
			GOLDEN.metrics.latencySum,
		);
	});

	test('TC-07 a logs panel runs without needing a metric', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);

		// Logs aggregate by expression, so there's no metric to fill.
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toBeVisible();
		await editor.query.run();
		await editor.save();
	});
});
