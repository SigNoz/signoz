import { Color } from '@signozhq/design-tokens';
import { Button, Skeleton, Switch, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import { formatNumberIntoHumanReadableFormat } from '../Summary/utils';
import { METRIC_TYPE_TO_COLOR_MAP, METRIC_TYPE_TO_ICON_MAP } from './constants';
import GraphPopover from './GraphPopover';
import TableView from './TableView';
import { GraphPopoverOptions, GraphViewProps } from './types';
import { HoverPopover, onGraphClick, onGraphHover } from './utils';

function GraphView({
	inspectMetricsTimeSeries,
	formattedInspectMetricsTimeSeries,
	metricUnit,
	metricName,
	metricType,
	spaceAggregationSeriesMap,
	inspectionStep,
	setPopoverOptions,
	popoverOptions,
	setShowExpandedView,
	setExpandedViewOptions,
	metricInspectionOptions,
	isInspectMetricsRefetching,
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
	const [showHoverPopover, setShowHoverPopover] = useState(false);
	const [
		hoverPopoverOptions,
		setHoverPopoverOptions,
	] = useState<GraphPopoverOptions | null>(null);
	const [viewType, setViewType] = useState<'graph' | 'table'>('graph');

	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent): void {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(event.target as Node) &&
				graphRef.current &&
				!graphRef.current.contains(event.target as Node)
			) {
				setShowGraphPopover(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return (): void => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [popoverRef, graphRef]);

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
							const d = new Date(v);
							const date = `${String(d.getDate()).padStart(2, '0')}/${String(
								d.getMonth() + 1,
							).padStart(2, '0')}`;
							const time = `${String(d.getHours()).padStart(2, '0')}:${String(
								d.getMinutes(),
							).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
							return `${date}\n${time}`; // two-line label
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
				{ label: 'Time' }, // This config is required as a placeholder for x-axis,
				...formattedInspectMetricsTimeSeries.slice(1).map((_, index) => ({
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
								formattedInspectMetricsTimeSeries,
							);
						});
						u.over.addEventListener('mousemove', (e) => {
							onGraphHover(
								e,
								u,
								setHoverPopoverOptions,
								inspectMetricsTimeSeries,
								formattedInspectMetricsTimeSeries,
							);
						});
						u.over.addEventListener('mouseenter', () => {
							setShowHoverPopover(true);
						});
						u.over.addEventListener('mouseleave', () => {
							setShowHoverPopover(false);
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
				<div className="view-toggle-button">
					<Switch
						checked={viewType === 'graph'}
						onChange={(checked): void => {
							const newViewType = checked ? 'graph' : 'table';
							setViewType(newViewType);
							logEvent(MetricsExplorerEvents.InspectViewChanged, {
								[MetricsExplorerEventKeys.Tab]: 'inspect',
								[MetricsExplorerEventKeys.InspectView]: newViewType,
							});
						}}
					/>
					<Typography.Text>
						{viewType === 'graph' ? 'Graph View' : 'Table View'}
					</Typography.Text>
				</div>
			</div>
			<div className="graph-view-container">
				{viewType === 'graph' &&
					(isInspectMetricsRefetching ? (
						<Skeleton active />
					) : (
						<Uplot data={formattedInspectMetricsTimeSeries} options={options} />
					))}

				{viewType === 'table' && (
					<TableView
						inspectionStep={inspectionStep}
						inspectMetricsTimeSeries={inspectMetricsTimeSeries}
						setShowExpandedView={setShowExpandedView}
						setExpandedViewOptions={setExpandedViewOptions}
						metricInspectionOptions={metricInspectionOptions}
						isInspectMetricsRefetching={isInspectMetricsRefetching}
					/>
				)}
			</div>
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
			{showHoverPopover && !showGraphPopover && hoverPopoverOptions && (
				<HoverPopover
					options={hoverPopoverOptions}
					step={inspectionStep}
					metricInspectionOptions={metricInspectionOptions}
				/>
			)}
		</div>
	);
}

export default GraphView;
