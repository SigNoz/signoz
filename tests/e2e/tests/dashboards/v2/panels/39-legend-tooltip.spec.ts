import type { Page } from '@playwright/test';

import { expect, test, type SeedApi } from '../../../../fixtures/dashboards';
import {
	boundingBoxOf,
	panelChart,
	panelRoot,
} from '../../../../helpers/panels-v2';
import {
	QueryRange,
	mockQueryRange,
	ramp,
	type SeriesSpec,
} from '../../../../helpers/query-range-mock';
import { uplotState } from '../../../../helpers/uplot';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: legend show/hide/solo semantics, legend search, and the tooltip.
//
// Three things shape the assertions:
//  1. Mocked — the golden series set shifts with the rolling window.
//  2. The legend is a virtualized VirtuosoGrid, so only in-view items exist in
//     the DOM; every assertion targets a named series, never a total count.
//  3. The click targets do the OPPOSITE of their names (PlotContext.tsx): the
//     item BODY solos (hides all others), the MARKER is the per-series on/off.
//
// Handles are `data-legend-item-id` and `data-is-legend-marker` — what
// `useLegendActions` itself branches on.

const SERIES: SeriesSpec[] = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(12, 3, 6) },
	{ labels: { 'service.name': 'frontend' }, points: ramp(12, 5, 2) },
];

async function seedThreeSeriesPanel(
	page: Page,
	dashboards: SeedApi,
	legendPosition?: 'bottom' | 'right',
): Promise<string> {
	await mockQueryRange(page, QueryRange.timeSeries(SERIES));
	const id = await dashboards.seedAndOpen(
		singlePanelDashboard(
			legendPosition
				? { pluginSpec: { legend: { position: legendPosition } } }
				: {},
		),
	);
	await expect(
		panelRoot(page, SINGLE_PANEL_ID).getByTestId('time-series-renderer'),
	).toBeVisible();
	return id;
}

test.describe('Dashboards V2 — legend and tooltip', () => {
	test('TC-01 the legend renders an item per series label', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards);
		const root = panelRoot(page, SINGLE_PANEL_ID);

		// Virtualized — assert named series, not a total.
		for (const label of ['adservice', 'cartservice']) {
			await expect(
				root.locator('[data-legend-item-id]').filter({ hasText: label }),
			).toHaveCount(1);
		}
	});

	test('TC-02 clicking an item body solos that series', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards);

		const root = panelRoot(page, SINGLE_PANEL_ID);
		const soloed = root
			.locator('[data-legend-item-id]')
			.filter({ hasText: 'cartservice' });
		const other = root
			.locator('[data-legend-item-id]')
			.filter({ hasText: 'adservice' });

		// Body click => solo.
		await soloed.locator('.legend-label').click();
		await expect(other).toHaveClass(/legend-item-off/);
		await expect(soloed).not.toHaveClass(/legend-item-off/);

		// Confirm the CHART hid it, not just the legend entry. uPlot labels are the
		// full legend string, so match on the series name inside.
		await expect
			.poll(async () => {
				const { series } = await uplotState(page, SINGLE_PANEL_ID);
				return series
					.filter((entry) => entry.show)
					.map((entry) => entry.label ?? '')
					.filter((label) => label.includes('cartservice')).length;
			})
			.toBe(1);
		await expect
			.poll(async () => {
				const { series } = await uplotState(page, SINGLE_PANEL_ID);
				return series.filter((entry) => entry.show).length;
			})
			.toBe(1);
	});

	test('TC-03 re-clicking the soloed item restores every series', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards);

		const root = panelRoot(page, SINGLE_PANEL_ID);
		const soloed = root
			.locator('[data-legend-item-id]')
			.filter({ hasText: 'cartservice' });
		const other = root
			.locator('[data-legend-item-id]')
			.filter({ hasText: 'adservice' });

		await soloed.locator('.legend-label').click();
		await expect(other).toHaveClass(/legend-item-off/);

		// Re-soloing the active series resets.
		await soloed.locator('.legend-label').click();
		await expect(other).not.toHaveClass(/legend-item-off/);
	});

	test('TC-03b clicking the marker toggles just that series off', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards);

		const root = panelRoot(page, SINGLE_PANEL_ID);
		const target = root
			.locator('[data-legend-item-id]')
			.filter({ hasText: 'adservice' });
		const other = root
			.locator('[data-legend-item-id]')
			.filter({ hasText: 'cartservice' });

		// Marker => per-series toggle, neighbours untouched.
		await target.locator('[data-is-legend-marker]').click();
		await expect(target).toHaveClass(/legend-item-off/);
		await expect(other).not.toHaveClass(/legend-item-off/);

		// In the chart: exactly the clicked series is hidden.
		await expect
			.poll(async () => {
				const { series } = await uplotState(page, SINGLE_PANEL_ID);
				const hidden = series.filter((entry) => !entry.show);
				return {
					count: hidden.length,
					isAdservice: hidden[0]?.label?.includes('adservice') ?? false,
				};
			})
			.toEqual({ count: 1, isAdservice: true });
	});

	test('TC-04 the legend search filters items when positioned right', async ({
		authedPage: page,
		dashboards,
	}) => {
		// Search only renders for a right-positioned legend.
		await seedThreeSeriesPanel(page, dashboards, 'right');

		const root = panelRoot(page, SINGLE_PANEL_ID);
		const search = root.getByTestId('legend-search-input');
		await expect(search).toBeVisible();

		await search.fill('cart');
		await expect(root.locator('[data-legend-item-id]')).toHaveCount(1);

		await search.fill('nothing-matches-this');
		await expect(root.locator('[data-legend-item-id]')).toHaveCount(0);
		await expect(
			root.getByText('No series found matching "nothing-matches-this"'),
		).toBeVisible();
	});

	test('TC-05 a bottom legend has no search box', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards, 'bottom');
		await expect(
			panelRoot(page, SINGLE_PANEL_ID).getByTestId('legend-search-input'),
		).toHaveCount(0);
	});

	test('TC-06 hovering the chart opens the tooltip', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards);

		const box = await boundingBoxOf(
			panelChart(page, SINGLE_PANEL_ID),
			'the chart',
		);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

		await expect(page.getByTestId('uplot-tooltip-container')).toBeVisible();
		await expect(page.getByTestId('uplot-tooltip-list')).toBeVisible();
	});

	// Pin key is 'p' (DEFAULT_PIN_TOOLTIP_KEY); its JSDoc still claims 'l'.
	test('TC-07 pressing P pins the tooltip and unpins it again', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedThreeSeriesPanel(page, dashboards);

		const box = await boundingBoxOf(
			panelChart(page, SINGLE_PANEL_ID),
			'the chart',
		);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await expect(page.getByTestId('uplot-tooltip-container')).toBeVisible();

		await page.keyboard.press('p');
		const unpin = page.getByTestId('uplot-tooltip-unpin');
		await expect(unpin).toBeVisible();

		// A pinned tooltip survives the pointer leaving the plot.
		await page.mouse.move(box.x - 20, box.y - 20);
		await expect(page.getByTestId('uplot-tooltip-container')).toBeVisible();

		await unpin.click();
		await expect(page.getByTestId('uplot-tooltip-unpin')).toHaveCount(0);
	});
});
