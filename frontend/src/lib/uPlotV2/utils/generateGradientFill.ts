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
	g.addColorStop(0, startColor);
	g.addColorStop(0.4, startColor);
	g.addColorStop(1, endColor);
	return g;
}
