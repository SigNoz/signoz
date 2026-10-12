import { convertValue } from 'lib/getConvertedValue';
import uPlot, { Hooks } from 'uplot';

import { Threshold, ThresholdsDrawHookOptions } from './types';

export function thresholdsDrawHook(
	options: ThresholdsDrawHookOptions,
): Hooks.Defs['draw'] {
	const dashSegments = [10, 5];

	function addLines(u: uPlot, scaleKey: string, thresholds: Threshold[]): void {
		const ctx = u.ctx;

		ctx.save();
		ctx.lineWidth = 2;
		ctx.setLineDash(dashSegments);

		const threshold90Percent = ctx.canvas.height * 0.9;

		for (let idx = 0; idx < thresholds.length; idx++) {
			const threshold = thresholds[idx];
			const color = threshold.thresholdColor || 'red';

			const yValue = convertValue(
				threshold.thresholdValue,
				threshold.thresholdUnit,
				options.yAxisUnit,
			);

			const scaleVal = u.valToPos(Number(yValue), scaleKey, true);

			ctx.strokeStyle = color;

			// A horizontal scale (e.g. a scatter plot's x) takes a vertical line.
			if (u.scales[scaleKey]?.ori === 0) {
				const x = Math.round(scaleVal);
				const top = Math.round(u.bbox.top);

				ctx.beginPath();
				ctx.moveTo(x, top);
				ctx.lineTo(x, Math.round(u.bbox.top + u.bbox.height));
				ctx.stroke();

				if (threshold.thresholdLabel) {
					const gap = 6 * uPlot.pxRatio;
					const textWidth = ctx.measureText(threshold.thresholdLabel).width;
					const fitsRight = x + gap + textWidth <= u.bbox.left + u.bbox.width;
					// uPlot leaves the last axis's text alignment on the context.
					ctx.save();
					ctx.fillStyle = color;
					ctx.textAlign = 'left';
					ctx.textBaseline = 'top';
					ctx.fillText(
						threshold.thresholdLabel,
						fitsRight ? x + gap : x - gap - textWidth,
						top + gap,
					);
					ctx.restore();
				}
				continue;
			}

			const x0 = Math.round(u.bbox.left);
			const y0 = Math.round(scaleVal);
			const x1 = Math.round(u.bbox.left + u.bbox.width);
			const y1 = Math.round(scaleVal);

			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);

			ctx.stroke();

			// Draw threshold label if present
			if (threshold.thresholdLabel) {
				const textWidth = ctx.measureText(threshold.thresholdLabel).width;
				const textX = x1 - textWidth - 20;
				const yposHeight = ctx.canvas.height - y1;
				const textY = yposHeight > threshold90Percent ? y0 + 15 : y0 - 15;

				ctx.fillStyle = color;
				ctx.fillText(threshold.thresholdLabel, textX, textY);
			}
		}
	}

	const { scaleKey, thresholds } = options;

	return (u: uPlot): void => {
		const ctx = u.ctx;
		addLines(u, scaleKey, thresholds);
		ctx.restore();
	};
}
