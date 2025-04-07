import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import Uplot from 'components/Uplot';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { RefreshCcwIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { METRIC_TYPE_TO_COLOR_MAP, METRIC_TYPE_TO_ICON_MAP } from './constants';
import { GraphViewProps } from './types';

function GraphView({
	inspectMetricsTimeSeries,
	formattedInspectMetricsTimeSeries,
	resetInspection,
	metricUnit,
	metricName,
	metricType,
}: GraphViewProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const startMs = useMemo(() => Math.floor(Number(minTime) / 1000000000), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / 1000000000), [
		maxTime,
	]);

	const options: uPlot.Options = useMemo(
		() => ({
			width: dimensions.width,
			height: 500,
			legend: {
				show: false,
			},
			axes: [
				{
					stroke: isDarkMode ? Color.TEXT_VANILLA_400 : Color.BG_SLATE_400,
				},
				{
					label: metricUnit || '',
					stroke: isDarkMode ? Color.TEXT_VANILLA_400 : Color.BG_SLATE_400,
				},
			],
			series: [
				...inspectMetricsTimeSeries.map((_, index) => {
					const label = String.fromCharCode(65 + (index % 26));
					const strokeColor = generateColor(
						label,
						isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
					);
					return {
						drawStyle: 'line',
						lineInterpolation: 'spline',
						show: true,
						label,
						stroke: strokeColor,
						width: 2,
						spanGaps: true,
						points: {
							size: 5,
							show: false,
							stroke: strokeColor,
						},
						scales: {
							x: {
								time: true,
								min: startMs,
								max: endMs,
							},
						},
					};
				}),
			],
		}),
		[
			dimensions.width,
			endMs,
			inspectMetricsTimeSeries,
			isDarkMode,
			metricUnit,
			startMs,
		],
	);

	const MetricTypeIcon = metricType ? METRIC_TYPE_TO_ICON_MAP[metricType] : null;

	return (
		<div className="inspect-metrics-graph-view" ref={graphRef}>
			<div className="inspect-metrics-graph-view-header">
				<Button.Group>
					<Button
						className="metric-name-button-label"
						size="middle"
						icon={
							MetricTypeIcon && metricType ? (
								<MetricTypeIcon
									size={14}
									color={METRIC_TYPE_TO_COLOR_MAP[metricType]}
								/>
							) : null
						}
						disabled
					>
						{metricName}
					</Button>
					<Button className="time-series-button-label" size="middle" disabled>
						{`${inspectMetricsTimeSeries.length} time series`}
					</Button>
				</Button.Group>

				<Button
					size="middle"
					icon={<RefreshCcwIcon size={14} />}
					onClick={resetInspection}
				>
					Show different data
				</Button>
			</div>
			<Uplot data={formattedInspectMetricsTimeSeries} options={options} />
		</div>
	);
}

export default GraphView;
