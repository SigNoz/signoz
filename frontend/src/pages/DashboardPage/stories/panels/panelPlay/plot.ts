import type { UPlotHostElement } from 'lib/uPlotV2/components/UPlotChart/utils';
import { expect, waitFor } from 'storybook/test';
import type uPlot from 'uplot';

import { PANEL_LOAD } from './args';

export const findPlot = (root: HTMLElement): uPlot | undefined =>
	[...root.querySelectorAll<UPlotHostElement>('div')].find(
		(node) => node.__uplot,
	)?.__uplot;

/** The live uPlot instance, once it has drawn `seriesCount` series. */
export const waitForPlot = async (
	root: HTMLElement,
	seriesCount: number,
): Promise<uPlot> => {
	let plot: uPlot | undefined;
	await waitFor(async () => {
		plot = findPlot(root);
		await expect(
			plot?.series.slice(1).filter((series) => series.show),
		).toHaveLength(seriesCount);
	}, PANEL_LOAD);

	return plot as uPlot;
};

export const toRgb = (color: string): [number, number, number] => {
	const probe = document.createElement('canvas').getContext('2d');
	if (!probe) {
		throw new Error('no 2d context to resolve the colour');
	}
	probe.fillStyle = color;
	probe.fillRect(0, 0, 1, 1);
	const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;

	return [r, g, b];
};

/**
 * Share (0–1) of the plot row at `value` painted in `color`. Threshold lines are
 * drawn straight onto the canvas and leave no state on the instance; the line is
 * 2px, dashed and anti-aliased, so three rows are read and a column counts when
 * any of them is close.
 */
export const lineCoverage = (
	plot: uPlot,
	value: number,
	color: string,
): number => {
	const [r, g, b] = toRgb(color);
	const y = Math.round(plot.valToPos(value, 'y', true));
	const x = Math.round(plot.bbox.left);
	const width = Math.round(plot.bbox.width);
	const { data } = plot.ctx.getImageData(x, y - 1, width, 3);
	let hits = 0;
	for (let column = 0; column < width; column++) {
		for (let row = 0; row < 3; row++) {
			const i = (row * width + column) * 4;
			if (
				data[i + 3] > 0 &&
				Math.abs(data[i] - r) < 60 &&
				Math.abs(data[i + 1] - g) < 60 &&
				Math.abs(data[i + 2] - b) < 60
			) {
				hits += 1;
				break;
			}
		}
	}

	return width > 0 ? hits / width : 0;
};
