import {
	ActiveElement,
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	ChartData,
	ChartEvent,
	ChartOptions,
	ChartType,
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
import * as chartjsAdapter from 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import isEqual from 'lodash-es/isEqual';
import React, { memo, useCallback, useEffect, useRef } from 'react';

import { hasData } from './hasData';
import { getAxisLabelColor } from './helpers';
import { legend } from './Plugin';
import {
	createDragSelectPlugin,
	createDragSelectPluginOptions,
	dragSelectPluginId,
	DragSelectPluginOptions,
} from './Plugin/DragSelect';
import { emptyGraph } from './Plugin/EmptyGraph';
import {
	createIntersectionCursorPlugin,
	createIntersectionCursorPluginOptions,
	intersectionCursorPluginId,
	IntersectionCursorPluginOptions,
} from './Plugin/IntersectionCursor';
import { TooltipPosition as TooltipPositionHandler } from './Plugin/Tooltip';
import { LegendsContainer } from './styles';
import { useXAxisTimeUnit } from './xAxisConfig';
import { getToolTipValue, getYAxisFormattedValue } from './yAxisConfig';

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

function Graph({
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
}: GraphProps): JSX.Element {
	const nearestDatasetIndex = useRef<null | number>(null);
	const chartRef = useRef<HTMLCanvasElement>(null);
	const isDarkMode = useIsDarkMode();

	const currentTheme = isDarkMode ? 'dark' : 'light';
	const xAxisTimeUnit = useXAxisTimeUnit(data); // Computes the relevant time unit for x axis by analyzing the time stamp data

	const lineChartRef = useRef<Chart>();
	const getGridColor = useCallback(() => {
		if (currentTheme === undefined) {
			return 'rgba(231,233,237,0.1)';
		}

		if (currentTheme === 'dark') {
			return 'rgba(231,233,237,0.1)';
		}

		return 'rgba(231,233,237,0.8)';
	}, [currentTheme]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const buildChart = useCallback(() => {
		if (lineChartRef.current !== undefined) {
			lineChartRef.current.destroy();
		}

		if (chartRef.current !== null) {
			const options: CustomChartOptions = {
				animation: {
					duration: animate ? 200 : 0,
				},
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					annotation: staticLine
						? {
								annotations: [
									{
										type: 'line',
										yMin: staticLine.yMin,
										yMax: staticLine.yMax,
										borderColor: staticLine.borderColor,
										borderWidth: staticLine.borderWidth,
										label: {
											content: staticLine.lineText,
											enabled: true,
											font: {
												size: 10,
											},
											borderWidth: 0,
											position: 'start',
											backgroundColor: 'transparent',
											color: staticLine.textColor,
										},
									},
								],
						  }
						: undefined,
					title: {
						display: title !== undefined,
						text: title,
					},
					legend: {
						display: false,
					},
					tooltip: {
						callbacks: {
							title(context) {
								const date = dayjs(context[0].parsed.x);
								return date.format('MMM DD, YYYY, HH:mm:ss');
							},
							label(context) {
								let label = context.dataset.label || '';

								if (label) {
									label += ': ';
								}
								if (context.parsed.y !== null) {
									label += getToolTipValue(context.parsed.y.toString(), yAxisUnit);
								}

								return label;
							},
							labelTextColor(labelData) {
								if (labelData.datasetIndex === nearestDatasetIndex.current) {
									return 'rgba(255, 255, 255, 1)';
								}

								return 'rgba(255, 255, 255, 0.75)';
							},
						},
						position: 'custom',
					},
					[dragSelectPluginId]: createDragSelectPluginOptions(
						!!onDragSelect,
						onDragSelect,
						dragSelectColor,
					),
					[intersectionCursorPluginId]: createIntersectionCursorPluginOptions(
						!!onDragSelect,
						currentTheme === 'dark' ? 'white' : 'black',
					),
				},
				layout: {
					padding: 0,
				},
				scales: {
					x: {
						grid: {
							display: true,
							color: getGridColor(),
							drawTicks: true,
						},
						adapters: {
							date: chartjsAdapter,
						},
						time: {
							unit: xAxisTimeUnit?.unitName || 'minute',
							stepSize: xAxisTimeUnit?.stepSize || 1,
							displayFormats: {
								millisecond: 'HH:mm:ss',
								second: 'HH:mm:ss',
								minute: 'HH:mm',
								hour: 'MM/dd HH:mm',
								day: 'MM/dd',
								week: 'MM/dd',
								month: 'yy-MM',
								year: 'yy',
							},
						},
						type: 'time',
						ticks: { color: getAxisLabelColor(currentTheme) },
					},
					y: {
						display: true,
						grid: {
							display: true,
							color: getGridColor(),
						},
						ticks: {
							color: getAxisLabelColor(currentTheme),
							// Include a dollar sign in the ticks
							callback(value) {
								return getYAxisFormattedValue(value.toString(), yAxisUnit);
							},
						},
					},
					stacked: {
						display: isStacked === undefined ? false : 'auto',
					},
				},
				elements: {
					line: {
						tension: 0,
						cubicInterpolationMode: 'monotone',
					},
					point: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						hoverBackgroundColor: (ctx: any) => {
							if (ctx?.element?.options?.borderColor) {
								return ctx.element.options.borderColor;
							}
							return 'rgba(0,0,0,0.1)';
						},
						hoverRadius: 5,
					},
				},
				onClick: (event, element, chart) => {
					if (onClickHandler) {
						onClickHandler(event, element, chart, data);
					}
				},
				onHover: (event, _, chart) => {
					if (event.native) {
						const interactions = chart.getElementsAtEventForMode(
							event.native,
							'nearest',
							{
								intersect: false,
							},
							true,
						);

						if (interactions[0]) {
							nearestDatasetIndex.current = interactions[0].datasetIndex;
						}
					}
				},
			};

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
		title,
		getGridColor,
		xAxisTimeUnit?.unitName,
		xAxisTimeUnit?.stepSize,
		isStacked,
		type,
		data,
		name,
		yAxisUnit,
		onClickHandler,
		staticLine,
		onDragSelect,
		dragSelectColor,
		currentTheme,
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
}

declare module 'chart.js' {
	interface TooltipPositionerMap {
		custom: TooltipPositionerFunction<ChartType>;
	}
}

type CustomChartOptions = ChartOptions & {
	plugins: {
		[dragSelectPluginId]: DragSelectPluginOptions | false;
		[intersectionCursorPluginId]: IntersectionCursorPluginOptions | false;
	};
};

interface GraphProps {
	animate?: boolean;
	type: ChartType;
	data: Chart['data'];
	title?: string;
	isStacked?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	forceReRender?: boolean | null | number;
	staticLine?: StaticLineProps | undefined;
	containerHeight?: string | number;
	onDragSelect?: (start: number, end: number) => void;
	dragSelectColor?: string;
}

export interface StaticLineProps {
	yMin: number | undefined;
	yMax: number | undefined;
	borderColor: string;
	borderWidth: number;
	lineText: string;
	textColor: string;
}

export type GraphOnClickHandler = (
	event: ChartEvent,
	elements: ActiveElement[],
	chart: Chart,
	data: ChartData,
) => void;

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

export default memo(Graph, (prevProps, nextProps) =>
	isEqual(prevProps.data, nextProps.data),
);
