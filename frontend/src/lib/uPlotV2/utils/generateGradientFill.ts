import uPlot from 'uplot';

export function generateGradientFill(
	uPlotInstance: uPlot,
	startColor: string,
	endColor: string,
): CanvasGradient {
	const g = uPlotInstance.ctx.createLinearGradient(
		0,
		0,
		0,
		uPlotInstance.bbox.height,
	);
	g.addColorStop(0, `${startColor}70`);
	g.addColorStop(0.6, `${startColor}40`);
	g.addColorStop(1, endColor);
	return g;
}
