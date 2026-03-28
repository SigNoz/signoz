import { ExecStats } from 'api/v5/v5';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getInitialStackedBands } from 'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { get } from 'lodash-es';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { AlignedData } from 'uplot';

import { PanelMode } from '../types';
import { fillMissingXAxisTimestamps, getXAxisTimestamps } from '../utils';
import { buildBaseConfig } from '../utils/baseConfigBuilder';

export function prepareBarPanelData(
	apiResponse: MetricRangePayloadProps,
): AlignedData {
	const seriesList = apiResponse?.data?.result || [];
	const timestampArr = getXAxisTimestamps(seriesList);
	const yAxisValuesArr = fillMissingXAxisTimestamps(timestampArr, seriesList);
	return [timestampArr, ...yAxisValuesArr];
}

export function prepareBarPanelConfig({
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
	apiResponse?: MetricRangePayloadProps;
	timezone: Timezone;
	panelMode: PanelMode;
	minTimeScale?: number;
	maxTimeScale?: number;
}): UPlotConfigBuilder {
	const stepIntervals: ExecStats['stepIntervals'] = get(
		apiResponse,
		'data.newResult.meta.stepIntervals',
		{},
	);
	const minStepInterval = Math.min(...Object.values(stepIntervals));

	const builder = buildBaseConfig({
		id: widget.id,
		thresholds: widget.thresholds,
		yAxisUnit: widget.yAxisUnit,
		softMin: widget.softMin ?? undefined,
		softMax: widget.softMax ?? undefined,
		isLogScale: widget.isLogScale,
		isDarkMode,
		onClick,
		onDragSelect,
		apiResponse,
		timezone,
		panelMode,
		panelType: PANEL_TYPES.BAR,
		minTimeScale,
		maxTimeScale,
		stepInterval: minStepInterval,
	});

	if (!(apiResponse && apiResponse?.data?.result)) {
		// if no data, return the builder without adding any series
		return builder;
	}

	if (widget.stackedBarChart) {
		const seriesCount = (apiResponse.data.result.length ?? 0) + 1; // +1 for 1-based uPlot series indices
		builder.setBands(getInitialStackedBands(seriesCount));
	}

	apiResponse.data.result.forEach((series) => {
		const baseLabelName = getLabelName(
			series.metric,
			series.queryName || '', // query
			series.legend || '',
		);

		const label = currentQuery
			? getLegend(series, currentQuery, baseLabelName)
			: baseLabelName;

		const currentStepInterval = get(stepIntervals, series.queryName, undefined);

		builder.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			label: label,
			colorMapping: widget.customLegendColors ?? {},
			isDarkMode,
			stepInterval: currentStepInterval,
		});
	});

	return builder;
}
