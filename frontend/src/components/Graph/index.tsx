import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Decimation,
	Filler,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	SubTitle,
	TimeScale,
	TimeSeriesScale,
	Title,
	Tooltip,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { generateGridTitle } from 'container/GridPanelSwitch/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import isEqual from 'lodash-es/isEqual';
import {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
} from 'react';

import { hasData } from './hasData';
import { legend } from './Plugin';
import { createDragSelectPlugin } from './Plugin/DragSelect';
import { emptyGraph } from './Plugin/EmptyGraph';
import { createIntersectionCursorPlugin } from './Plugin/IntersectionCursor';
import { TooltipPosition as TooltipPositionHandler } from './Plugin/Tooltip';
import { LegendsContainer } from './styles';
import { CustomChartOptions, GraphProps, ToggleGraphProps } from './types';
import { getGraphOptions, toggleGraph } from './utils';
import { useXAxisTimeUnit } from './xAxisConfig';

Chart.register(
	LineElement,
	PointElement,
	LineController,
	CategoryScale,
	LinearScale,
	TimeScale,
	TimeSeriesScale,
	Decimation,
	Filler,
	Legend,
	Title,
	Tooltip,
	SubTitle,
	BarController,
	BarElement,
	annotationPlugin,
);

Tooltip.positioners.custom = TooltipPositionHandler;

const Graph = forwardRef<ToggleGraphProps | undefined, GraphProps>(
	(
		{
			animate = true,
			data,
			type,
			title,
			isStacked,
			onClickHandler,
			name,
			yAxisUnit = 'short',
			forceReRender,
			staticLine,
			containerHeight,
			onDragSelect,
			dragSelectColor,
		},
		ref,
	): JSX.Element => {
		const nearestDatasetIndex = useRef<null | number>(null);
		const chartRef = useRef<HTMLCanvasElement>(null);
		const isDarkMode = useIsDarkMode();
		const gridTitle = useMemo(() => generateGridTitle(title), [title]);

		const currentTheme = isDarkMode ? 'dark' : 'light';
		const xAxisTimeUnit = useXAxisTimeUnit(data); // Computes the relevant time unit for x axis by analyzing the time stamp data

		const lineChartRef = useRef<Chart>();

		useImperativeHandle(
			ref,
			(): ToggleGraphProps => ({
				toggleGraph(graphIndex: number, isVisible: boolean): void {
					toggleGraph(graphIndex, isVisible, lineChartRef);
				},
			}),
		);

		const getGridColor = useCallback(() => {
			if (currentTheme === undefined) {
				return 'rgba(231,233,237,0.1)';
			}

			if (currentTheme === 'dark') {
				return 'rgba(231,233,237,0.1)';
			}

			return 'rgba(231,233,237,0.8)';
		}, [currentTheme]);

		const buildChart = useCallback(() => {
			if (lineChartRef.current !== undefined) {
				lineChartRef.current.destroy();
			}

			if (chartRef.current !== null) {
				const options: CustomChartOptions = getGraphOptions(
					animate,
					staticLine,
					gridTitle,
					nearestDatasetIndex,
					yAxisUnit,
					onDragSelect,
					dragSelectColor,
					currentTheme,
					getGridColor,
					xAxisTimeUnit,
					isStacked,
					onClickHandler,
					data,
				);

				const chartHasData = hasData(data);
				const chartPlugins = [];

				if (chartHasData) {
					chartPlugins.push(createIntersectionCursorPlugin());
					chartPlugins.push(createDragSelectPlugin());
				} else {
					chartPlugins.push(emptyGraph);
				}

				chartPlugins.push(legend(name, data.datasets.length > 3));

				lineChartRef.current = new Chart(chartRef.current, {
					type,
					data,
					options,
					plugins: chartPlugins,
				});
			}
		}, [
			animate,
			staticLine,
			gridTitle,
			yAxisUnit,
			onDragSelect,
			dragSelectColor,
			currentTheme,
			getGridColor,
			xAxisTimeUnit,
			isStacked,
			onClickHandler,
			data,
			name,
			type,
		]);

		useEffect(() => {
			buildChart();
		}, [buildChart, forceReRender]);

		return (
			<div style={{ height: containerHeight }}>
				<canvas ref={chartRef} />
				<LegendsContainer id={name} />
			</div>
		);
	},
);

declare module 'chart.js' {
	interface TooltipPositionerMap {
		custom: TooltipPositionerFunction<ChartType>;
	}
}

Graph.defaultProps = {
	animate: undefined,
	title: undefined,
	isStacked: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	forceReRender: undefined,
	staticLine: undefined,
	containerHeight: '90%',
	onDragSelect: undefined,
	dragSelectColor: undefined,
};

Graph.displayName = 'Graph';

export default memo(Graph, (prevProps, nextProps) =>
	isEqual(prevProps.data, nextProps.data),
);
