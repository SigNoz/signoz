import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { applySpanGapsToAlignedData } from 'lib/uPlotV2/utils/dataUtils';
import uPlot, { AlignedData } from 'uplot';

export function prepareAlignedData({
	data,
	config,
}: {
	data: AlignedData;
	config: UPlotConfigBuilder;
}): AlignedData {
	const seriesSpanGaps = config.getSeriesSpanGapsOptions();
	return seriesSpanGaps.length > 0
		? applySpanGapsToAlignedData(data as AlignedData, seriesSpanGaps)
		: (data as AlignedData);
}

/** A chart container carrying its live uPlot instance, for tests and debugging. */
export interface UPlotHostElement extends HTMLDivElement {
	__uplot?: uPlot;
}

export function setInstanceHandle(
	node: HTMLDivElement | null,
	plot: uPlot | null,
): void {
	if (!node) {
		return;
	}
	if (plot) {
		(node as UPlotHostElement).__uplot = plot;
	} else {
		delete (node as UPlotHostElement).__uplot;
	}
}
