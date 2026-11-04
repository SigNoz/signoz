import { StackMode } from 'lib/uPlotV2/config/types';
import type uPlot from 'uplot';

import { resolveDistributionBars, resolveDistributionXAxis } from '../layout';
import { DistributionXScale } from '../types';
import { buildDistributionConfig } from '../utils';

// Buckets: ≤ 10, (10, 20], (20, 40], > 40. Only (10, 20] is occupied.
const xAxis = resolveDistributionXAxis([10, 20, 40], DistributionXScale.Linear);
const counts = [
	[0, 4, 0, 0],
	[0, 6, 0, 0],
];
const visible = [true, true];

function setCursorHook(): (u: uPlot) => void {
	const config = buildDistributionConfig({
		id: 'panel-1',
		xAxis,
		layout: resolveDistributionBars({
			xAxis,
			counts,
			visible,
			stack: StackMode.Normal,
			isLogY: false,
		}),
		labels: ['cart', 'checkout'],
		colors: ['#ff0000', '#00ff00'],
		visible,
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
	const u = {
		cursor: { left, top },
		posToVal: (position: number) => position,
		setSeries,
		redraw,
	} as unknown as uPlot;
	return { u, setSeries, redraw };
}

describe('buildDistributionConfig setCursor', () => {
	// TooltipPlugin only shows a tooltip for a focused series.
	it('focuses the group under the cursor, 1-based as uPlot counts series', () => {
		const { u, setSeries, redraw } = plotAt(15, 8);

		setCursorHook()(u);

		expect(setSeries).toHaveBeenCalledWith(2, { focus: true });
		expect(redraw).toHaveBeenCalledWith(true, false);
	});

	it('still focuses a group above the stack of an occupied bucket', () => {
		const { u, setSeries } = plotAt(15, 50);

		setCursorHook()(u);

		expect(setSeries).toHaveBeenCalledWith(1, { focus: true });
	});

	it('focuses nothing over an empty bucket', () => {
		const hook = setCursorHook();
		const { u, setSeries } = plotAt(15, 8);
		hook(u);

		u.cursor.left = 30;
		u.cursor.top = 1;
		hook(u);

		expect(setSeries).toHaveBeenLastCalledWith(null, { focus: true });
	});
});
