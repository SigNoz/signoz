import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getInitialStackedBands } from 'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import {
	DrawStyle,
	SelectionPreferencesSource,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { get } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import uPlot from 'uplot';

export interface MeterChartConfigProps {
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

export function buildMeterChartConfig({
	id,
	isDarkMode,
	currentQuery,
	onDragSelect,
	apiResponse,
	timezone,
	yAxisUnit,
	minTimeScale,
	maxTimeScale,
}: MeterChartConfigProps): UPlotConfigBuilder {
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
		panelType: PANEL_TYPES.BAR,
	});

	builder.addAxis({
		scaleKey: 'y',
		show: true,
		side: 3,
		isDarkMode,
		yAxisUnit,
		panelType: PANEL_TYPES.BAR,
	});

	if (!apiResponse?.data?.result) {
		return builder;
	}

	const seriesCount = (apiResponse.data.result.length ?? 0) + 1;
	builder.setBands(getInitialStackedBands(seriesCount));

	apiResponse.data.result.forEach((series) => {
		const baseLabelName = getLabelName(
			series.metric,
			series.queryName || '',
			series.legend || '',
		);

		const label = getLegend(series, currentQuery, baseLabelName);
		const currentStepInterval = get(stepIntervals, series.queryName, undefined);

		builder.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			label,
			colorMapping: {},
			isDarkMode,
			stepInterval: currentStepInterval,
			metric: series.metric,
		});
	});

	return builder;
}
