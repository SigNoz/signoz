import uPlot from 'uplot';

import { ExtendedSeries } from '../config/types';
import { BarRect, measureBar } from '../utils/barRect';

const DEFAULT_POINT_SIZE = 5;
const RING_GAP = 3;
const RING_WIDTH = 1.5;
const RING_DASH = [2, 2];

function drawRing(
	u: uPlot,
	series: ExtendedSeries,
	idx: number,
	value: number,
): void {
	const { ctx } = u;
	const { pxRatio } = uPlot;
	const cx = u.valToPos(u.data[0][idx], 'x', true);
	const cy = u.valToPos(value, series.scale ?? 'y', true);
	const radius = ((series.points?.size ?? DEFAULT_POINT_SIZE) / 2) * pxRatio;

	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.lineWidth = RING_WIDTH * pxRatio;
	ctx.setLineDash(RING_DASH.map((segment) => segment * pxRatio));
	ctx.beginPath();
	ctx.arc(cx, cy, radius + RING_GAP * pxRatio, 0, 2 * Math.PI);
	ctx.stroke();
}

function drawBarOutline(u: uPlot, rect: BarRect): void {
	const gap = RING_GAP * uPlot.pxRatio;
	u.ctx.lineWidth = RING_WIDTH * uPlot.pxRatio;
	u.ctx.setLineDash(RING_DASH.map((segment) => segment * uPlot.pxRatio));
	u.ctx.strokeRect(
		rect.left - gap,
		rect.top - gap,
		rect.width + 2 * gap,
		rect.height + 2 * gap,
	);
}

/**
 * Marks each series' partial buckets: a dotted outline around bars, a dot and dotted
 * ring on line and point series.
 */
export function partialPointsDrawHook(u: uPlot): void {
	const { ctx, bbox } = u;
	const xValues = u.data[0];

	ctx.save();
	ctx.beginPath();
	ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
	ctx.clip();

	for (let seriesIdx = 1; seriesIdx < u.series.length; seriesIdx += 1) {
		const series = u.series[seriesIdx] as ExtendedSeries;
		if (!series.show || !series.partialTimestamps) {
			continue;
		}
		const color =
			typeof series.stroke === 'function'
				? series.stroke(u, seriesIdx)
				: (series.stroke ?? '');
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.globalAlpha = series.alpha ?? 1;

		series.partialTimestamps.forEach((timestamp) => {
			const idx = u.valToIdx(timestamp);
			const value = u.data[seriesIdx][idx];
			if (xValues[idx] !== timestamp || value == null) {
				return;
			}
			ctx.setLineDash([]);
			const bar = measureBar(u, seriesIdx, idx);
			if (bar) {
				drawBarOutline(u, bar);
			} else {
				drawRing(u, series, idx, value);
			}
		});
	}

	ctx.restore();
}
