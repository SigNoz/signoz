import uPlot from 'uplot';

import {
	DEFAULT_FILL_OPACITY,
	GRADIENT_END_STOP,
	GRADIENT_MID_STOP,
	GRADIENT_MID_STOP_RATIO,
	GRADIENT_START_STOP,
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
	g.addColorStop(GRADIENT_START_STOP, `${startColor}${toAlphaHex(opacity)}`);
	g.addColorStop(
		GRADIENT_MID_STOP,
		`${startColor}${toAlphaHex(opacity * GRADIENT_MID_STOP_RATIO)}`,
	);
	g.addColorStop(GRADIENT_END_STOP, endColor);
	return g;
}
