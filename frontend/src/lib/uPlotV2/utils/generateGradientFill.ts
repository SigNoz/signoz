import uPlot from 'uplot';

import {
	DEFAULT_FILL_OPACITY,
	GRADIENT_MID_STOP_RATIO,
	toAlphaHex,
} from './fillOpacity';

export function generateGradientFill(
	uPlotInstance: uPlot,
	startColor: string,
	endColor: string,
	opacity: number = DEFAULT_FILL_OPACITY,
): CanvasGradient {
	const g = uPlotInstance.ctx.createLinearGradient(
		0,
		0,
		0,
		uPlotInstance.bbox.height,
	);
	g.addColorStop(0, `${startColor}${toAlphaHex(opacity)}`);
	g.addColorStop(
		0.6,
		`${startColor}${toAlphaHex(opacity * GRADIENT_MID_STOP_RATIO)}`,
	);
	g.addColorStop(1, endColor);
	return g;
}
