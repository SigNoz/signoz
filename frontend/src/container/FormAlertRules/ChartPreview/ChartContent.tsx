import { useMemo } from 'react';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import BarChart from 'container/DashboardContainer/visualization/charts/BarChart/BarChart';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import uPlot from 'uplot';

import {
	AlertChartPanelType,
	buildAlertChartConfig,
	buildChartId,
} from './utils';

// Panel types that render through the UPlotConfigBuilder pipeline.
// To support a new modern-chart panel type, add an entry here and extend
// `AlertChartPanelType` / `buildAlertChartConfig` to handle its series setup.
const SUPPORTED_CHARTS: Record<
	AlertChartPanelType,
	typeof TimeSeries | typeof BarChart
> = {
	[PANEL_TYPES.TIME_SERIES]: TimeSeries,
	[PANEL_TYPES.BAR]: BarChart,
};

const isSupportedPanelType = (
	panelType: PANEL_TYPES,
): panelType is AlertChartPanelType => panelType in SUPPORTED_CHARTS;

export interface ChartContentProps {
	panelType: PANEL_TYPES;
	alertId?: string;
	query: Query;
	apiResponse?: MetricRangePayloadProps;
	data: uPlot.AlignedData;
	thresholds: ThresholdProps[];
	yAxisUnit: string;
	legendPosition: LegendPosition;
	isDarkMode: boolean;
	timezone: Timezone;
	width: number;
	height: number;
	minTimeScale?: number;
	maxTimeScale?: number;
	onDragSelect: (start: number, end: number) => void;
}

export default function ChartContent({
	panelType,
	alertId,
	query,
	thresholds,
	apiResponse,
	data,
	yAxisUnit,
	isDarkMode,
	timezone,
	minTimeScale,
	maxTimeScale,
	onDragSelect,
	width,
	height,
	legendPosition,
}: ChartContentProps): JSX.Element | null {
	const supported = isSupportedPanelType(panelType);

	const config = useMemo(
		() =>
			buildAlertChartConfig({
				id: buildChartId(alertId),
				panelType: panelType as AlertChartPanelType,
				query,
				thresholds,
				apiResponse,
				yAxisUnit,
				isDarkMode,
				timezone,
				minTimeScale,
				maxTimeScale,
				onDragSelect,
			}),
		[
			alertId,
			panelType,
			query,
			thresholds,
			apiResponse,
			yAxisUnit,
			isDarkMode,
			timezone,
			minTimeScale,
			maxTimeScale,
			onDragSelect,
		],
	);

	if (!supported) {
		return null;
	}

	const Component = SUPPORTED_CHARTS[panelType];

	return (
		<Component
			config={config}
			data={data}
			width={width}
			height={height}
			legendConfig={{ position: legendPosition }}
			canPinTooltip
			yAxisUnit={yAxisUnit}
			timezone={timezone}
		/>
	);
}
