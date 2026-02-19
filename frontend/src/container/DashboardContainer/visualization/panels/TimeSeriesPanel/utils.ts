import { ExecStats } from 'api/v5/v5';
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
import { isInvalidPlotValue } from 'lib/uPlotV2/utils/dataUtils';
import get from 'lodash-es/get';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';

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

function hasSingleVisiblePointForSeries(series: QueryData): boolean {
	const rawValues = series.values ?? [];
	let validPointCount = 0;

	for (const [, rawValue] of rawValues) {
		if (!isInvalidPlotValue(rawValue)) {
			validPointCount += 1;
			if (validPointCount > 1) {
				return false;
			}
		}
	}

	return true;
}

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
	const stepIntervals: ExecStats['stepIntervals'] = get(
		apiResponse,
		'data.newResult.meta.stepIntervals',
		{},
	);
	const minStepInterval = Math.min(...Object.values(stepIntervals));

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
		stepInterval: minStepInterval,
	});

	apiResponse.data?.result?.forEach((series) => {
		const hasSingleValidPoint = hasSingleVisiblePointForSeries(series);
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
			drawStyle: hasSingleValidPoint ? DrawStyle.Points : DrawStyle.Line,
			label: label,
			colorMapping: widget.customLegendColors ?? {},
			spanGaps: true,
			lineStyle: LineStyle.Solid,
			lineInterpolation: LineInterpolation.Spline,
			showPoints: hasSingleValidPoint
				? VisibilityMode.Always
				: VisibilityMode.Never,
			pointSize: 5,
			isDarkMode,
			panelType: PANEL_TYPES.TIME_SERIES,
		});
	});

	return builder;
};
