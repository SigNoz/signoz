import { StackMode } from 'lib/uPlotV2/config/types';
import type uPlot from 'uplot';

import { resolveDistributionBars, resolveDistributionXAxis } from '../layout';
import { buildDistributionConfig } from '../config';

// Buckets ≤ 10, (10, 20], (20, 40], > 40 in slots [0, 1] … [3, 4]. Only (10, 20] is occupied.
const xAxis = resolveDistributionXAxis([10, 20, 40]);
const counts = [
	[0, 4, 0, 0],
	[0, 6, 0, 0],
];

function setCursorHook(drawnCounts = counts): (u: uPlot) => void {
	const config = buildDistributionConfig({
		id: 'panel-1',
		xAxis,
		layout: resolveDistributionBars({
			xAxis,
			counts: drawnCounts,
			stack: StackMode.Normal,
			isLogY: false,
		}),
		labels: drawnCounts.map((_, index) => `group-${index}`),
		colors: drawnCounts.map(() => '#ff0000'),
		stack: StackMode.Normal,
		isLogY: false,
		isDarkMode: true,
		markers: [],
	}).getConfig();
	const [hook] = config.hooks?.setCursor ?? [];
	return hook as (u: uPlot) => void;
}

/** Pixels are values, so the cursor sits at `(left, top)` in scale space. */
function plotAt(
	left: number,
	top: number,
): { u: uPlot; setSeries: jest.Mock; redraw: jest.Mock } {
	const setSeries = jest.fn();
	const redraw = jest.fn();
	const plot: Partial<uPlot> = {
		cursor: { left, top },
		posToVal: (position: number) => position,
		setSeries,
		redraw,
	};
	return { u: plot as uPlot, setSeries, redraw };
}

describe('buildDistributionConfig cursor', () => {
	it('turns off drag-to-zoom', () => {
		const config = buildDistributionConfig({
			id: 'panel-1',
			xAxis,
			layout: resolveDistributionBars({
				xAxis,
				counts,
				stack: StackMode.Normal,
				isLogY: false,
			}),
			labels: ['group-0', 'group-1'],
			colors: ['#ff0000', '#ff0000'],
			stack: StackMode.Normal,
			isLogY: false,
			isDarkMode: true,
			markers: [],
		}).getConfig();

		expect(config.cursor?.drag).toMatchObject({ x: false, y: false });
	});
});

describe('buildDistributionConfig setCursor', () => {
	// TooltipPlugin only shows a tooltip for a focused series.
	it('focuses the group under the cursor, 1-based as uPlot counts series', () => {
		const { u, setSeries, redraw } = plotAt(1.5, 8);

		setCursorHook()(u);

		expect(setSeries).toHaveBeenCalledWith(2, { focus: true });
		expect(redraw).toHaveBeenCalledWith(true, false);
	});

	it('focuses the nearest group above the stack, dimming the rest', () => {
		const { u, setSeries, redraw } = plotAt(1.5, 50);

		setCursorHook()(u);

		expect(setSeries).toHaveBeenCalledWith(2, { focus: true });
		expect(redraw).toHaveBeenCalledWith(true, false);
	});

	it('keeps a tooltip over an empty bucket without dimming any group', () => {
		const hook = setCursorHook();
		const { u, setSeries, redraw } = plotAt(1.5, 8);
		hook(u);
		redraw.mockClear();

		u.cursor.left = 2.5;
		u.cursor.top = 1;
		hook(u);

		expect(setSeries).toHaveBeenLastCalledWith(1, { focus: true });
		expect(redraw).toHaveBeenCalledWith(true, false);
	});

	it('focuses nothing off the plot', () => {
		const hook = setCursorHook();
		const { u, setSeries } = plotAt(1.5, 8);
		hook(u);

		u.cursor.left = -1;
		hook(u);

		expect(setSeries).toHaveBeenLastCalledWith(null, { focus: true });
	});

	it('focuses nothing over an empty bucket when every group is hidden', () => {
		const { u, setSeries } = plotAt(2.5, 1);

		setCursorHook([])(u);

		expect(setSeries).not.toHaveBeenCalled();
	});
});
