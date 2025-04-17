import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { RefreshCcwIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { formatNumberIntoHumanReadableFormat } from '../Summary/utils';
import { METRIC_TYPE_TO_COLOR_MAP, METRIC_TYPE_TO_ICON_MAP } from './constants';
import GraphPopover from './GraphPopover';
import { GraphViewProps } from './types';
import { onGraphClick } from './utils';

function GraphView({
	inspectMetricsTimeSeries,
	formattedInspectMetricsTimeSeries,
	resetInspection,
	metricUnit,
	metricName,
	metricType,
	spaceAggregationSeriesMap,
	inspectionStep,
	setPopoverOptions,
	popoverOptions,
	setShowExpandedView,
	setExpandedViewOptions,
}: GraphViewProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const start = useMemo(() => Math.floor(Number(minTime) / 1000000000), [
		minTime,
	]);
	const end = useMemo(() => Math.floor(Number(maxTime) / 1000000000), [maxTime]);
	const [showGraphPopover, setShowGraphPopover] = useState(false);

	const popoverRef = useRef<HTMLDivElement>(null);
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
					grid: {
						show: false,
					},
					values: (_, vals): string[] =>
						vals.map((v) => {
							const d = new Date(v * 1000);
							const day = String(d.getDate()).padStart(2, '0');
							const month = String(d.getMonth() + 1).padStart(2, '0');
							return `${day}/${month}`;
						}),
				},
				{
					label: metricUnit || '',
					stroke: isDarkMode ? Color.TEXT_VANILLA_400 : Color.BG_SLATE_400,
					grid: {
						show: true,
						stroke: isDarkMode ? Color.BG_SLATE_500 : Color.BG_SLATE_200,
					},
					values: (_, vals): string[] =>
						vals.map((v) => formatNumberIntoHumanReadableFormat(v, false)),
				},
			],
			series: [
				...formattedInspectMetricsTimeSeries.map((_, index) => ({
					drawStyle: 'line',
					lineInterpolation: 'spline',
					show: true,
					label: String.fromCharCode(65 + (index % 26)),
					stroke: inspectMetricsTimeSeries[index]?.strokeColor,
					width: 2,
					spanGaps: true,
					points: {
						size: 5,
						show: false,
						stroke: inspectMetricsTimeSeries[index]?.strokeColor,
					},
					scales: {
						x: {
							min: start,
							max: end,
						},
					},
				})),
			],
			hooks: {
				ready: [
					(u: uPlot): void => {
						u.over.addEventListener('click', (e) => {
							onGraphClick(
								e,
								u,
								popoverRef,
								setPopoverOptions,
								inspectMetricsTimeSeries,
								showGraphPopover,
								setShowGraphPopover,
							);
						});
					},
				],
			},
		}),
		[
			dimensions.width,
			isDarkMode,
			metricUnit,
			formattedInspectMetricsTimeSeries,
			inspectMetricsTimeSeries,
			start,
			end,
			setPopoverOptions,
			showGraphPopover,
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
						{/* First time series in that of timestamps. Hence -1 */}
						{`${formattedInspectMetricsTimeSeries.length - 1} time series`}
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
			{showGraphPopover && (
				<GraphPopover
					options={popoverOptions}
					spaceAggregationSeriesMap={spaceAggregationSeriesMap}
					popoverRef={popoverRef}
					step={inspectionStep}
					openInExpandedView={(): void => {
						setShowGraphPopover(false);
						setShowExpandedView(true);
						setExpandedViewOptions(popoverOptions);
					}}
				/>
			)}
		</div>
	);
}

export default GraphView;
