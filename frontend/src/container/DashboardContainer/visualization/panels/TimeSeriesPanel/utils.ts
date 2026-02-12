import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	fillMissingXAxisTimestamps,
	getXAxisTimestamps,
} from 'container/DashboardContainer/visualization/panels/utils';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DrawStyle,
	LineInterpolation,
	LineStyle,
	VisibilityMode,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { PanelMode } from '../types';
import { buildBaseConfig } from '../utils/baseConfigBuilder';

export const prepareChartData = (
	apiResponse: MetricRangePayloadProps,
): uPlot.AlignedData => {
	const seriesList = apiResponse?.data?.result || [];
	const timestampArr = getXAxisTimestamps(seriesList);
	const yAxisValuesArr = fillMissingXAxisTimestamps(timestampArr, seriesList);

	return [timestampArr, ...yAxisValuesArr];
};

export const prepareUPlotConfig = ({
	widget,
	isDarkMode,
	currentQuery,
	onClick,
	onDragSelect,
	apiResponse,
	timezone,
	panelMode,
	minTimeScale,
	maxTimeScale,
}: {
	widget: Widgets;
	isDarkMode: boolean;
	currentQuery: Query;
	onClick: OnClickPluginOpts['onClick'];
	onDragSelect: (startTime: number, endTime: number) => void;
	apiResponse: MetricRangePayloadProps;
	timezone: Timezone;
	panelMode: PanelMode;
	minTimeScale?: number;
	maxTimeScale?: number;
}): UPlotConfigBuilder => {
	const builder = buildBaseConfig({
		widget,
		isDarkMode,
		onClick,
		onDragSelect,
		apiResponse,
		timezone,
		panelMode,
		panelType: PANEL_TYPES.TIME_SERIES,
		minTimeScale,
		maxTimeScale,
	});

	apiResponse.data?.result?.forEach((series) => {
		const baseLabelName = getLabelName(
			series.metric,
			series.queryName || '', // query
			series.legend || '',
		);

		const label = currentQuery
			? getLegend(series, currentQuery, baseLabelName)
			: baseLabelName;

		builder.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Line,
			label: label,
			colorMapping: widget.customLegendColors ?? {},
			spanGaps: true,
			lineStyle: LineStyle.Solid,
			lineInterpolation: LineInterpolation.Spline,
			showPoints: VisibilityMode.Never,
			pointSize: 5,
			isDarkMode,
			panelType: PANEL_TYPES.TIME_SERIES,
		});
	});

	return builder;
};
