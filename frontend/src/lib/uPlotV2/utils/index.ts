export function calculateWidthBasedOnStepInterval({
	uPlotInstance,
	stepInterval,
}: {
	uPlotInstance: uPlot;
	stepInterval: number;
}): number {
	const xScale = uPlotInstance.scales.x;
	if (xScale && typeof xScale.min === 'number') {
		const start = xScale.min as number;
		const end = start + stepInterval;
		const startPx = uPlotInstance.valToPos(start, 'x');
		const endPx = uPlotInstance.valToPos(end, 'x');
		return Math.abs(endPx - startPx);
	}
	return 0;
}
