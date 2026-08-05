import { expect, test } from '../../../../fixtures/dashboards';
import {
	GOLDEN,
	PanelKind,
	logsCountQuery,
} from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	EditorText,
	QueryTab,
	editor,
	queryTab,
	runQuery,
	savePanel,
	selectMetric,
} from '../../../../helpers/panel-editor-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the query pane and its commit semantics.
//
// The rule worth pinning: editing the builder does NOT move the preview (only
// Run, or a structural change, commits into the draft) — but Save serialises
// the LIVE query anyway, so an unrun edit still persists. Contradictory-looking
// and easy to "fix" into a regression.

test.describe('Dashboards V2 — panel editor query pane', () => {
	test('TC-01 the builder offers every query type the kind supports', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expect(queryTab(page, QueryTab.builder)).toBeVisible();
		await expect(queryTab(page, QueryTab.clickhouse)).toBeVisible();
		await expect(queryTab(page, QueryTab.promql)).toBeVisible();
	});

	test('TC-02 a List panel offers only the Query Builder tab', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.List }),
			SINGLE_PANEL_ID,
		);

		// Hidden here, not disabled — the switcher is the one that disables.
		await expect(queryTab(page, QueryTab.builder)).toBeVisible();
		await expect(queryTab(page, QueryTab.clickhouse)).toHaveCount(0);
		await expect(queryTab(page, QueryTab.promql)).toHaveCount(0);
	});

	test('TC-03 Run Query issues a fresh query_range', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(page.getByTestId('time-series-renderer')).toBeVisible();

		await runQuery(page);
	});

	test('TC-04 the run keyboard shortcut works from inside the builder', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(page.getByTestId('time-series-renderer')).toBeVisible();

		// Bound with onKeyDownCapture, so it fires from inside inputs too.
		const response = page.waitForResponse((r) =>
			r.url().includes('/query_range'),
		);
		await editor.queryBuilder(page).click();
		await page.keyboard.press('ControlOrMeta+Enter');
		await response;
	});

	test('TC-05 switching query type re-renders the pane and marks the panel dirty', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.unsavedBadge(page)).toHaveCount(0);

		await queryTab(page, QueryTab.promql).click();
		await expect(queryTab(page, QueryTab.promql)).toHaveAttribute(
			'aria-selected',
			'true',
		);

		// Structural change: auto-commits without Run.
		await expect(editor.unsavedBadge(page)).toBeVisible();
	});

	test('TC-06 choosing a metric makes a new panel savable', async ({
		authedPage: page,
		dashboards,
	}) => {
		// create → configure → save. A new metrics panel seeds an empty
		// aggregation and is rejected until a metric is picked (03-creation TC-09).
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		await page.getByTestId('add-panel-header').click();
		await page.getByTestId(`panel-type-${PanelKind.TimeSeries}`).click();
		await expect(editor.root(page)).toBeVisible();

		await selectMetric(page, GOLDEN.metrics.calls);
		await editor.title(page).fill('Configured then saved');
		await savePanel(page);

		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));

		const after = await getDashboardV2ViaApi(page, id);
		const saved = Object.values(after.spec.panels).find(
			(candidate) => candidate.spec.display.name === 'Configured then saved',
		);
		expect(saved).toBeDefined();
		expect(JSON.stringify(saved?.spec.queries)).toContain(GOLDEN.metrics.calls);
	});

	test('TC-07 an unrun query edit is still persisted by Save', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		// No Run: `buildSaveSpec` serialises the live query, so the edit must
		// survive — otherwise saving without running loses work.
		await selectMetric(page, GOLDEN.metrics.latencyCount);
		await savePanel(page);

		await expect
			.poll(async () => {
				const after = await getDashboardV2ViaApi(page, id);
				return JSON.stringify(
					after.spec.panels[SINGLE_PANEL_ID].spec.queries,
				).includes(GOLDEN.metrics.latencyCount);
			})
			.toBe(true);
	});

	test('TC-08 the in-editor query survives a reload', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await selectMetric(page, GOLDEN.metrics.latencySum);
		await runQuery(page);

		// No forceReset, so the URL query wins and survives a refresh.
		await page.reload();
		await expect(editor.root(page)).toBeVisible();
		await expect(
			page.getByTestId('metric-name-selector-0').locator('input'),
		).toHaveValue(GOLDEN.metrics.latencySum);
	});

	test('TC-09 a logs panel runs without needing a metric', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);

		// Logs aggregate by expression, so there's no metric to fill.
		await expect(
			page.getByRole('button', { name: EditorText.runQuery }),
		).toBeVisible();
		await runQuery(page);
		await savePanel(page);
	});
});
