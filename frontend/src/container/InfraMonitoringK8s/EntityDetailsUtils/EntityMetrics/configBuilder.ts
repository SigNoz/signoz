import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import {
	DrawStyle,
	FillMode,
	LineInterpolation,
	LineStyle,
	SelectionPreferencesSource,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { hasSingleVisiblePoint } from 'lib/uPlotV2/utils/dataUtils';
import { get } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import uPlot from 'uplot';

export interface EntityMetricsChartConfigProps {
	id: string;
	isDarkMode: boolean;
	currentQuery: Query;
	onDragSelect: (startTime: number, endTime: number) => void;
	apiResponse?: MetricRangePayloadProps;
	timezone: Timezone;
	yAxisUnit: string;
	minTimeScale?: number;
	maxTimeScale?: number;
}

export function buildEntityMetricsChartConfig({
	id,
	isDarkMode,
	currentQuery,
	onDragSelect,
	apiResponse,
	timezone,
	yAxisUnit,
	minTimeScale,
	maxTimeScale,
}: EntityMetricsChartConfigProps): UPlotConfigBuilder {
	const stepIntervals = get(
		apiResponse,
		'data.newResult.meta.stepIntervals',
		{},
	) as Record<string, number>;
	const minStepInterval = Object.keys(stepIntervals).length
		? Math.min(...Object.values(stepIntervals))
		: undefined;

	const tzDate = (timestamp: number): Date =>
		uPlot.tzDate(new Date(timestamp * 1e3), timezone.value);

	const builder = new UPlotConfigBuilder({
		id,
		onDragSelect,
		tzDate,
		selectionPreferencesSource: SelectionPreferencesSource.IN_MEMORY,
		stepInterval: minStepInterval,
	});

	builder.addScale({
		scaleKey: 'x',
		time: true,
		min: minTimeScale,
		max: maxTimeScale,
	});

	builder.addScale({
		scaleKey: 'y',
		time: false,
	});

	builder.addAxis({
		scaleKey: 'x',
		show: true,
		side: 2,
		isDarkMode,
		panelType: PANEL_TYPES.TIME_SERIES,
	});

	builder.addAxis({
		scaleKey: 'y',
		show: true,
		side: 3,
		isDarkMode,
		yAxisUnit,
		panelType: PANEL_TYPES.TIME_SERIES,
	});

	if (!apiResponse?.data?.result) {
		return builder;
	}

	apiResponse.data.result.forEach((series) => {
		const hasSingleValidPoint = hasSingleVisiblePoint(series.values);
		const baseLabelName = getLabelName(
			series.metric,
			series.queryName || '',
			series.legend || '',
		);

		const label = getLegend(series, currentQuery, baseLabelName);

		builder.addSeries({
			scaleKey: 'y',
			drawStyle: hasSingleValidPoint ? DrawStyle.Points : DrawStyle.Line,
			label,
			colorMapping: {},
			spanGaps: true,
			lineStyle: LineStyle.Solid,
			lineInterpolation: LineInterpolation.Spline,
			showPoints: hasSingleValidPoint,
			pointSize: 5,
			fillMode: FillMode.None,
			isDarkMode,
			metric: series.metric,
		});
	});

	return builder;
}
