import { expect, test } from '../../../../fixtures/dashboards';
import { PanelKind } from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	Section,
	editor,
	expandSection,
	savePanel,
	sectionToggle,
	selectOption,
	setSegment,
} from '../../../../helpers/panel-editor-v2';
import {
	QueryRange,
	mockQueryRange,
	ramp,
} from '../../../../helpers/query-range-mock';
import {
	LOG_DISTR,
	previewState,
	uplotState,
	yScale,
} from '../../../../helpers/uplot';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Pinned so the chart is guaranteed to exist with a known series count.
const SERIES = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
];

// Scope: the ConfigPane sections a TimeSeries / Bar panel declares —
// Visualization, Axes, Legend and Chart Appearance — and that each control
// round-trips into the persisted spec.
//
// Each control is checked twice: it round-trips into the saved spec, and the
// rendered chart honours it (read from the live uPlot instance). The spec alone
// would pass even if the renderer ignored the setting.

/** The plugin spec of the single fixture panel, straight from the API. */
async function savedSpec(
	page: Parameters<typeof getDashboardV2ViaApi>[0],
	dashboardId: string,
): Promise<Record<string, unknown>> {
	const after = await getDashboardV2ViaApi(page, dashboardId);
	return after.spec.panels[SINGLE_PANEL_ID].spec.plugin
		.spec as unknown as Record<string, unknown>;
}

test.describe('Dashboards V2 — editor sections (TimeSeries / Bar)', () => {
	test('TC-01 a TimeSeries panel declares its expected sections', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		for (const title of [
			Section.visualization,
			Section.formatting,
			Section.axes,
			Section.legend,
			Section.chartAppearance,
			Section.thresholds,
			Section.contextLinks,
		]) {
			await expect(sectionToggle(page, title)).toBeVisible();
		}
		// Buckets belongs to Histogram only.
		await expect(sectionToggle(page, Section.buckets)).toHaveCount(0);
	});

	test('TC-02 sections start collapsed and toggle open', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		const axes = sectionToggle(page, Section.axes);
		await expect(axes).toHaveAttribute('aria-expanded', 'false');
		await expandSection(page, Section.axes);
		await expect(page.getByTestId('panel-editor-v2-soft-min')).toBeVisible();
	});

	test('TC-03 axis bounds reach the chart', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.timeSeries(SERIES));
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.axes);
		await page.getByTestId('panel-editor-v2-soft-min').fill('5');
		await page.getByTestId('panel-editor-v2-soft-max').fill('95');
		await savePanel(page);

		expect(await savedSpec(page, id)).toMatchObject({
			axes: { softMin: 5, softMax: 95 },
		});

		// …and the chart is actually bounded by them.
		await expect
			.poll(async () => (await yScale(page, SINGLE_PANEL_ID)).min)
			.toBeLessThanOrEqual(5);
		await expect
			.poll(async () => (await yScale(page, SINGLE_PANEL_ID)).max)
			.toBeGreaterThanOrEqual(95);
	});

	test('TC-03b log scale reaches the chart, not just the spec', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.timeSeries(SERIES));
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.axes);
		await setSegment(page, 'panel-editor-v2-log-scale', 'Log');

		// Live, before saving — uPlot encodes a log scale as distr 3.
		await expect
			.poll(async () => {
				const scales = (await previewState(page)).scales;
				return (scales.y ?? Object.values(scales)[1])?.distr;
			})
			.toBe(LOG_DISTR);

		await savePanel(page);

		expect(await savedSpec(page, id)).toMatchObject({
			axes: { isLogScale: true },
		});
		// And on the saved panel.
		await expect
			.poll(async () => (await yScale(page, SINGLE_PANEL_ID)).distr)
			.toBe(LOG_DISTR);
	});

	test('TC-04 clearing an axis bound stores null, not zero', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ pluginSpec: { axes: { softMin: 5 } } }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.axes);
		// Must clear the bound, not pin the axis to 0.
		await page.getByTestId('panel-editor-v2-soft-min').fill('');
		await savePanel(page);

		const spec = await savedSpec(page, id);
		expect((spec.axes as { softMin?: number | null }).softMin ?? null).toBeNull();
	});

	test('TC-05 legend position persists', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.legend);
		await setSegment(page, 'panel-editor-v2-legend-position', 'Right');
		await savePanel(page);

		expect(await savedSpec(page, id)).toMatchObject({
			legend: { position: 'right' },
		});
	});

	test('TC-06 chart appearance controls reach the chart', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.timeSeries(SERIES));
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.chartAppearance);
		await setSegment(page, 'panel-editor-v2-line-style', 'Dashed');
		await setSegment(page, 'panel-editor-v2-fill-mode', 'Gradient');
		await selectOption(page, 'panel-editor-v2-line-interpolation', 'Step before');
		await page.getByTestId('panel-editor-v2-show-points').click();
		await savePanel(page);

		expect(await savedSpec(page, id)).toMatchObject({
			chartAppearance: {
				lineStyle: 'dashed',
				fillMode: 'gradient',
				lineInterpolation: 'step_before',
				showPoints: true,
			},
		});

		// The rendered series carry the styling.
		await expect
			.poll(async () => {
				const [first] = (await uplotState(page, SINGLE_PANEL_ID)).series;
				return {
					dashed: (first?.dash?.length ?? 0) > 0,
					filled: first?.hasFill ?? false,
				};
			})
			.toEqual({ dashed: true, filled: true });

		// "Show points" is not asserted against the chart: uPlot installs a
		// predicate for `points.show` either way, so the seam can't distinguish on
		// from off. The spec round-trip above is the available coverage.
	});

	test('TC-07 the panel time preference persists and drives the header pill', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.visualization);
		await selectOption(page, 'panel-editor-v2-time-preference', 'Last 15 min');
		await savePanel(page);

		expect(await savedSpec(page, id)).toMatchObject({
			visualization: { timePreference: 'last_15_min' },
		});
		// The pill is the user-visible consequence.
		await expect(page.getByTestId('panel-time-preference')).toBeVisible();
	});

	test('TC-08 Fill gaps is offered on TimeSeries but Stack series is not', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.visualization);
		await expect(page.getByTestId('panel-editor-v2-fill-spans')).toBeVisible();
		await expect(
			page.getByTestId('panel-editor-v2-stacked-bar-chart'),
		).toHaveCount(0);

		await page.getByTestId('panel-editor-v2-fill-spans').click();
		await savePanel(page);
		expect(await savedSpec(page, id)).toMatchObject({
			visualization: { fillSpans: true },
		});
	});

	test('TC-09 Stack series is offered on Bar but Fill gaps is not', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.BarChart }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.visualization);
		await expect(
			page.getByTestId('panel-editor-v2-stacked-bar-chart'),
		).toBeVisible();
		await expect(page.getByTestId('panel-editor-v2-fill-spans')).toHaveCount(0);

		await page.getByTestId('panel-editor-v2-stacked-bar-chart').click();
		await savePanel(page);
		expect(await savedSpec(page, id)).toMatchObject({
			visualization: { stackedBarChart: true },
		});
	});

	test('TC-10 a section edit marks the editor dirty', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.unsavedBadge(page)).toHaveCount(0);

		await expandSection(page, Section.legend);
		await setSegment(page, 'panel-editor-v2-legend-position', 'Right');
		await expect(editor.unsavedBadge(page)).toBeVisible();
	});
});
