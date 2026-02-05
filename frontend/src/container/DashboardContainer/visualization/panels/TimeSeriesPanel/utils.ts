import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	fillMissingXAxisTimestamps,
	getXAxisTimestamps,
} from 'container/DashboardContainer/visualization/panels/utils';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import onClickPlugin, {
	OnClickPluginOpts,
} from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DistributionType,
	DrawStyle,
	LineInterpolation,
	LineStyle,
	SelectionPreferencesSource,
	VisibilityMode,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { ThresholdsDrawHookOptions } from 'lib/uPlotV2/hooks/types';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { PanelMode } from '../types';

export const prepareChartData = (
	apiResponse: MetricRangePayloadProps,
): uPlot.AlignedData => {
	const seriesList = apiResponse?.data?.result || [];
	const timestampArr = getXAxisTimestamps(seriesList);
	const yAxisValuesArr = fillMissingXAxisTimestamps(timestampArr, seriesList);

	return [timestampArr, ...yAxisValuesArr];
};

export const prepareUPlotConfig = ({
	widgetId,
	apiResponse,
	tzDate,
	minTimeScale,
	maxTimeScale,
	isLogScale,
	thresholds,
	softMin,
	softMax,
	spanGaps,
	colorMapping,
	lineInterpolation,
	isDarkMode,
	currentQuery,
	onDragSelect,
	onClick,
	yAxisUnit,
	panelMode,
}: {
	widgetId: string;
	apiResponse: MetricRangePayloadProps;
	tzDate: uPlot.LocalDateFromUnix;
	minTimeScale: number | undefined;
	maxTimeScale: number | undefined;
	isLogScale: boolean;
	softMin: number | null;
	softMax: number | null;
	spanGaps: boolean;
	colorMapping: Record<string, string>;
	lineInterpolation: LineInterpolation;
	isDarkMode: boolean;
	thresholds: ThresholdsDrawHookOptions;
	currentQuery: Query;
	yAxisUnit: string;
	onDragSelect: (startTime: number, endTime: number) => void;
	onClick?: OnClickPluginOpts['onClick'];
	panelMode: PanelMode;
}): UPlotConfigBuilder => {
	const builder = new UPlotConfigBuilder({
		onDragSelect,
		widgetId,
		tzDate,
		shouldSaveSelectionPreference: panelMode === PanelMode.DASHBOARD_VIEW,
		selectionPreferencesSource: [
			PanelMode.DASHBOARD_VIEW,
			PanelMode.STANDALONE_VIEW,
		].includes(panelMode)
			? SelectionPreferencesSource.LOCAL_STORAGE
			: SelectionPreferencesSource.IN_MEMORY,
	});

	// X scale – time axis
	builder.addScale({
		scaleKey: 'x',
		time: true,
		min: minTimeScale,
		max: maxTimeScale,
		logBase: isLogScale ? 10 : undefined,
		distribution: isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	// Y scale – value axis, driven primarily by softMin/softMax and data
	builder.addScale({
		scaleKey: 'y',
		time: false,
		min: undefined,
		max: undefined,
		softMin: softMin ?? undefined,
		softMax: softMax ?? undefined,
		thresholds,
		logBase: isLogScale ? 10 : undefined,
		distribution: isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	builder.addThresholds(thresholds);

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
			colorMapping,
			spanGaps,
			lineStyle: LineStyle.Solid,
			lineInterpolation,
			showPoints: VisibilityMode.Never,
			pointSize: 5,
			isDarkMode,
		});
	});

	if (typeof onClick === 'function') {
		builder.addPlugin(
			onClickPlugin({
				onClick,
				apiResponse,
			}),
		);
	}

	builder.addAxis({
		scaleKey: 'x',
		show: true,
		side: 2,
		isDarkMode,
		isLogScale: false,
		panelType: PANEL_TYPES.TIME_SERIES,
	});

	builder.addAxis({
		scaleKey: 'y',
		show: true,
		side: 3,
		isDarkMode,
		isLogScale: false,
		yAxisUnit,
		panelType: PANEL_TYPES.TIME_SERIES,
	});
	return builder;
};
