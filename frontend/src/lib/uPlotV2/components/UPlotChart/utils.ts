import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { applySpanGapsToAlignedData } from 'lib/uPlotV2/utils/dataUtils';
import { AlignedData } from 'uplot';

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
