import { useMemo } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { buildBaseConfig } from 'container/DashboardContainer/visualization/panels/utils/baseConfigBuilder';
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
import { v4 } from 'uuid';

import {
	getColorsForSeverityLabels,
	getMinStepIntervalFromSeries,
} from './utils';

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
			id: v4(),
			isDarkMode,
			onDragSelect,
			timezone,
			minTimeScale,
			maxTimeScale,
			yAxisUnit,
			stepInterval: getMinStepIntervalFromSeries(data),
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
				// Without a group by, getLabelName falls back to the query name ("A"),
				// which is meaningless to the reader — the color alone identifies the
				// series. A blank label has to be whitespace rather than '': uPlot
				// replaces falsy labels with its own "Value" default.
				label: isLabelEnabled ? label : ' ',
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
