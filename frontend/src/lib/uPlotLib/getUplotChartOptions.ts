/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable sonarjs/cognitive-complexity */
import './uPlotLib.styles.scss';

import { PANEL_TYPES } from 'constants/queryBuilder';
import { FullViewProps } from 'container/GridCardLayout/GridCard/FullView/types';
import { saveLegendEntriesToLocalStorage } from 'container/GridCardLayout/GridCard/FullView/utils';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { Dimensions } from 'hooks/useDimensions';
import { convertValue } from 'lib/getConvertedValue';
import { cloneDeep, isUndefined } from 'lodash-es';
import _noop from 'lodash-es/noop';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import onClickPlugin, { OnClickPluginOpts } from './plugins/onClickPlugin';
import tooltipPlugin from './plugins/tooltipPlugin';
import getAxes from './utils/getAxes';
import getSeries from './utils/getSeriesData';
import { getXAxisScale } from './utils/getXAxisScale';
import { getYAxisScale } from './utils/getYAxisScale';

export interface GetUPlotChartOptions {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	panelType?: PANEL_TYPES;
	onDragSelect?: (startTime: number, endTime: number) => void;
	yAxisUnit?: string;
	onClickHandler?: OnClickPluginOpts['onClick'];
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates?: FullViewProps['setGraphsVisibilityStates'];
	thresholds?: ThresholdProps[];
	thresholdValue?: number;
	thresholdText?: string;
	fillSpans?: boolean;
	minTimeScale?: number;
	maxTimeScale?: number;
	softMin: number | null;
	softMax: number | null;
	currentQuery?: Query;
	stackBarChart?: boolean;
	hiddenGraph?: {
		[key: string]: boolean;
	};
	setHiddenGraph?: Dispatch<
		SetStateAction<{
			[key: string]: boolean;
		}>
	>;
	customTooltipElement?: HTMLDivElement;
	verticalLineTimestamp?: number;
	tzDate?: (timestamp: number) => Date;
	timezone?: string;
	customSeries?: (data: QueryData[]) => uPlot.Series[];
}

/** the function converts series A , series B , series C to
 *  series A , series A + series B , series A + series B + series C
 *  which helps us to always ensure the bar in the front is always
 *  of the smallest value.
 */

function getStackedSeries(apiResponse: QueryData[]): QueryData[] {
	const series = cloneDeep(apiResponse);

	if (!series) {
		return series;
	}

	for (let i = series.length - 2; i >= 0; i--) {
		const { values } = series[i];
		for (let j = 0; j < values.length; j++) {
			values[j][1] = String(
				parseFloat(values[j]?.[1] || '0') +
					parseFloat(series[i + 1].values[j]?.[1] || '0'),
			);
		}

		series[i].values = values;
	}

	return series;
}

/** this does the exact same operations as the function above for a different
 *  response format.
 */
function getStackedSeriesQueryFormat(apiResponse: QueryData[]): QueryData[] {
	const series = cloneDeep(apiResponse);
	if (!series) {
		return apiResponse;
	}

	for (let i = series.length - 2; i >= 0; i--) {
		const { values } = series[i];
		for (let j = 0; j < values.length; j++) {
			values[j].value = String(
				parseFloat(values[j]?.value || '0') +
					parseFloat(series[i + 1].values[j]?.value || '0'),
			);
		}

		series[i].values = values;
	}

	return series;
}

function getStackedSeriesYAxis(apiResponse: QueryDataV3[]): QueryDataV3[] {
	const series = cloneDeep(apiResponse);
	if (!series) {
		return apiResponse;
	}

	for (let i = 0; i < series.length; i++) {
		series[i].series = getStackedSeriesQueryFormat(series[i].series || []);
	}

	return series;
}

/**
 * here we define the different series bands which should get highlighted based
 * on cursor hover. basically the to and the from destination of a particular band.
 */
function getBands(series): any[] {
	const bands = [];
	for (let i = 0; i < series.length; i++) {
		bands.push({
			series: [i === 0 ? -1 : i, i + 1],
		});
	}
	return bands;
}

export const getUPlotChartOptions = ({
	id,
	dimensions,
	isDarkMode,
	apiResponse,
	onDragSelect,
	yAxisUnit,
	minTimeScale,
	maxTimeScale,
	onClickHandler = _noop,
	graphsVisibilityStates,
	setGraphsVisibilityStates,
	thresholds,
	softMax,
	softMin,
	panelType,
	currentQuery,
	stackBarChart: stackChart,
	hiddenGraph,
	setHiddenGraph,
	customTooltipElement,
	verticalLineTimestamp,
	tzDate,
	timezone,
	customSeries,
}: GetUPlotChartOptions): uPlot.Options => {
	const timeScaleProps = getXAxisScale(minTimeScale, maxTimeScale);

	const stackBarChart = stackChart && isUndefined(hiddenGraph);

	const isAnomalyRule =
		apiResponse?.data?.newResult?.data?.result[0]?.isAnomaly || false;

	const series = getStackedSeries(apiResponse?.data?.result || []);

	const bands = stackBarChart ? getBands(series) : null;

	return {
		id,
		width: dimensions.width,
		height: dimensions.height - 30,
		legend: {
			show: true,
			live: false,
			isolate: true,
		},
		focus: {
			alpha: 0.3,
		},
		cursor: {
			lock: false,
			focus: {
				prox: 1e6,
				bias: 1,
			},
			points: {
				size: (u, seriesIdx): number => u.series[seriesIdx].points.size * 3,
				width: (u, seriesIdx, size): number => size / 4,
				stroke: (u, seriesIdx): string =>
					`${u.series[seriesIdx].points.stroke(u, seriesIdx)}90`,
				fill: (): string => '#fff',
			},
		},
		tzDate,
		padding: [16, 16, 8, 8],
		bands,
		scales: {
			x: {
				spanGaps: true,
				...timeScaleProps,
			},
			y: {
				...getYAxisScale({
					thresholds,
					series: stackBarChart
						? getStackedSeriesYAxis(apiResponse?.data?.newResult?.data?.result || [])
						: apiResponse?.data?.newResult?.data?.result || [],
					yAxisUnit,
					softMax,
					softMin,
				}),
			},
		},
		plugins: [
			tooltipPlugin({
				apiResponse,
				yAxisUnit,
				stackBarChart,
				isDarkMode,
				customTooltipElement,
				timezone,
			}),
			onClickPlugin({
				onClick: onClickHandler,
				apiResponse,
			}),
			{
				hooks: {
					draw: [
						(u): void => {
							if (verticalLineTimestamp) {
								const { ctx } = u;
								ctx.save();
								ctx.setLineDash([4, 2]);
								ctx.strokeStyle = 'white';
								ctx.lineWidth = 1;
								const x = u.valToPos(verticalLineTimestamp, 'x', true);

								ctx.beginPath();
								ctx.moveTo(x, u.bbox.top);
								ctx.lineTo(x, u.bbox.top + u.bbox.height);
								ctx.stroke();
								ctx.setLineDash([]);
								ctx.restore();
							}
						},
					],
				},
			},
		],
		hooks: {
			draw: [
				(u): void => {
					if (isAnomalyRule) {
						return;
					}

					thresholds?.forEach((threshold) => {
						if (threshold.thresholdValue !== undefined) {
							const { ctx } = u;
							ctx.save();
							const yPos = u.valToPos(
								convertValue(
									threshold.thresholdValue,
									threshold.thresholdUnit,
									yAxisUnit,
								),
								'y',
								true,
							);
							ctx.strokeStyle = threshold.thresholdColor || 'red';
							ctx.lineWidth = 2;
							ctx.setLineDash([10, 5]);
							ctx.beginPath();
							const plotLeft = u.bbox.left; // left edge of the plot area
							const plotRight = plotLeft + u.bbox.width; // right edge of the plot area
							ctx.moveTo(plotLeft, yPos);
							ctx.lineTo(plotRight, yPos);
							ctx.stroke();
							// Text configuration
							if (threshold.thresholdLabel) {
								const text = threshold.thresholdLabel;
								const textX = plotRight - ctx.measureText(text).width - 20;
								const canvasHeight = ctx.canvas.height;
								const yposHeight = canvasHeight - yPos;
								const isHeightGreaterThan90Percent = canvasHeight * 0.9 < yposHeight;
								// Adjust textY based on the condition
								let textY;
								if (isHeightGreaterThan90Percent) {
									textY = yPos + 15; // Below the threshold line
								} else {
									textY = yPos - 15; // Above the threshold line
								}
								ctx.fillStyle = threshold.thresholdColor || 'red';
								ctx.fillText(text, textX, textY);
							}
							ctx.restore();
						}
					});
				},
			],
			setSelect: [
				(self): void => {
					const selection = self.select;
					if (selection) {
						const startTime = self.posToVal(selection.left, 'x');
						const endTime = self.posToVal(selection.left + selection.width, 'x');

						const diff = endTime - startTime;

						if (typeof onDragSelect === 'function' && diff > 0) {
							onDragSelect(startTime * 1000, endTime * 1000);
						}
					}
				},
			],
			ready: [
				(self): void => {
					const legend = self.root.querySelector('.u-legend');
					if (legend) {
						const seriesEls = legend.querySelectorAll('.u-series');
						const seriesArray = Array.from(seriesEls);
						seriesArray.forEach((seriesEl, index) => {
							seriesEl.addEventListener('click', () => {
								if (stackChart) {
									setHiddenGraph((prev) => {
										if (isUndefined(prev)) {
											return { [index]: true };
										}
										if (prev[index] === true) {
											return undefined;
										}
										return { [index]: true };
									});
								}
								if (graphsVisibilityStates) {
									setGraphsVisibilityStates?.((prev) => {
										const newGraphVisibilityStates = [...prev];
										if (
											newGraphVisibilityStates[index + 1] &&
											newGraphVisibilityStates.every((value, i) =>
												i === index + 1 ? value : !value,
											)
										) {
											newGraphVisibilityStates.fill(true);
										} else {
											newGraphVisibilityStates.fill(false);
											newGraphVisibilityStates[index + 1] = true;
										}
										saveLegendEntriesToLocalStorage({
											options: self,
											graphVisibilityState: newGraphVisibilityStates,
											name: id || '',
										});
										return newGraphVisibilityStates;
									});
								}
							});
						});
					}
				},
			],
		},
		series: customSeries
			? customSeries(apiResponse?.data?.result || [])
			: getSeries({
					series:
						stackBarChart && isUndefined(hiddenGraph)
							? series || []
							: apiResponse?.data?.result || [],
					widgetMetaData: apiResponse?.data?.result || [],
					graphsVisibilityStates,
					panelType,
					currentQuery,
					stackBarChart,
					hiddenGraph,
					isDarkMode,
			  }),
		axes: getAxes({ isDarkMode, yAxisUnit, panelType }),
	};
};
