import { useMemo } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { buildBaseConfig } from 'lib/visualization/panels/utils/baseConfigBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import getLabelName from 'lib/getLabelName';
import { colors } from 'lib/getRandomColor';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { useTimezone } from 'providers/Timezone';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import { getColorsForSeverityLabels } from './utils';

export interface UseLogsExplorerChartConfigParams {
	data: QueryData[];
	isLogsExplorerViews?: boolean;
	isLabelEnabled?: boolean;
	onDragSelect: (start: number, end: number) => void;
	minTimeScale?: number;
	maxTimeScale?: number;
	yAxisUnit?: string;
}

export interface UseLogsExplorerChartConfigResult {
	config: UPlotConfigBuilder;
	chartData: uPlot.AlignedData;
}

export function useLogsExplorerChartConfig({
	data,
	isLogsExplorerViews = false,
	isLabelEnabled = true,
	onDragSelect,
	minTimeScale,
	maxTimeScale,
	yAxisUnit,
}: UseLogsExplorerChartConfigParams): UseLogsExplorerChartConfigResult {
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	// getUPlotChartData / buildBaseConfig both consume the legacy query-range payload
	// shape, so the raw series list is wrapped instead of being plotted directly.
	const apiResponse = useMemo(
		() =>
			({
				data: { result: data, resultType: '' },
			}) as unknown as MetricRangePayloadProps,
		[data],
	);

	const chartData = useMemo(() => getUPlotChartData(apiResponse), [apiResponse]);

	const config = useMemo(() => {
		const builder = buildBaseConfig({
			id: 'logs-explorer-frequency-chart',
			isDarkMode,
			onDragSelect,
			timezone,
			minTimeScale,
			maxTimeScale,
			yAxisUnit,
			panelType: PANEL_TYPES.BAR,
		});

		data.forEach((series, index) => {
			const label = getLabelName(
				series.metric,
				series.queryName || '',
				series.legend || '',
			);

			const color = isLogsExplorerViews
				? getColorsForSeverityLabels(label, index)
				: colors[index % colors.length] || themeColors.red;

			builder.addSeries({
				scaleKey: 'y',
				drawStyle: DrawStyle.Bar,
				// No group-by yields query name "A"; use ' ' not '' so uPlot does not default the label to "Value".
				label: isLabelEnabled && label.trim() ? label : ' ',
				lineColor: color,
				colorMapping: {},
				isDarkMode,
			});
		});

		return builder;
	}, [
		data,
		isDarkMode,
		isLabelEnabled,
		isLogsExplorerViews,
		maxTimeScale,
		minTimeScale,
		onDragSelect,
		timezone,
		yAxisUnit,
	]);

	return { config, chartData };
}
