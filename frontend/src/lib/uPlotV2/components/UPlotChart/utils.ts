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

/**
 * The live uPlot instance, hung off its own container element.
 *
 * Charts render to a canvas, so from the outside there is nothing to assert on
 * beyond pixels — an E2E test can see that a chart exists but not that a series
 * was hidden, an axis bound applied, or a line turned dashed. Exposing the
 * instance on its container gives those tests (and anyone debugging in the
 * console) the real chart state to read.
 *
 * On the container rather than a global: it is naturally scoped per panel, it
 * needs no registry keyed by id, and it is collected along with the node.
 */
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
