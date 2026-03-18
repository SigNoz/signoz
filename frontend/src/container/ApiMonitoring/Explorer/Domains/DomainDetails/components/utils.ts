import { ExecStats } from 'api/v5/v5';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { buildBaseConfig } from 'container/DashboardContainer/visualization/panels/utils/baseConfigBuilder';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { get } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import { v4 } from 'uuid';

export const prepareStatusCodeBarChartsConfig = ({
	timezone,
	isDarkMode,
	query,
	onDragSelect,
	onClick,
	apiResponse,
	minTimeScale,
	maxTimeScale,
	yAxisUnit,
	colorMapping,
}: {
	timezone: Timezone;
	isDarkMode: boolean;
	query: Query;
	onDragSelect: (startTime: number, endTime: number) => void;
	onClick?: OnClickPluginOpts['onClick'];
	minTimeScale?: number;
	maxTimeScale?: number;
	apiResponse: MetricRangePayloadProps;
	yAxisUnit?: string;
	colorMapping?: Record<string, string>;
}): UPlotConfigBuilder => {
	const stepIntervals: ExecStats['stepIntervals'] = get(
		apiResponse,
		'data.newResult.meta.stepIntervals',
		{},
	);
	const minStepInterval = Math.min(...Object.values(stepIntervals));

	const config = buildBaseConfig({
		id: v4(),
		yAxisUnit: yAxisUnit,
		apiResponse,
		isDarkMode,
		onDragSelect,
		timezone,
		onClick,
		minTimeScale,
		maxTimeScale,
		stepInterval: minStepInterval,
		panelType: PANEL_TYPES.BAR,
	});

	const seriesList: QueryData[] = apiResponse?.data?.result || [];
	seriesList.forEach((series) => {
		const baseLabelName = getLabelName(
			series.metric,
			series.queryName || '', // query
			series.legend || '',
		);

		const label = query ? getLegend(series, query, baseLabelName) : baseLabelName;

		const currentStepInterval = get(stepIntervals, series.queryName, undefined);

		config.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			label: label,
			colorMapping: colorMapping ?? {},
			isDarkMode,
			stepInterval: currentStepInterval,
		});
	});

	return config;
};
