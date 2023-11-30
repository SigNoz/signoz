/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable sonarjs/cognitive-complexity */
import './uPlotLib.styles.scss';

import { FullViewProps } from 'container/GridCardLayout/GridCard/FullView/types';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { Dimensions } from 'hooks/useDimensions';
import { convertValue } from 'lib/getConvertedValue';
import _noop from 'lodash-es/noop';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import onClickPlugin, { OnClickPluginOpts } from './plugins/onClickPlugin';
import tooltipPlugin from './plugins/tooltipPlugin';
import getAxes from './utils/getAxes';
import getSeries from './utils/getSeriesData';

interface GetUPlotChartOptions {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	onDragSelect?: (startTime: number, endTime: number) => void;
	yAxisUnit?: string;
	onClickHandler?: OnClickPluginOpts['onClick'];
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates?: FullViewProps['setGraphsVisibilityStates'];
	thresholds?: ThresholdProps[];
	thresholdValue?: number;
	thresholdText?: string;
	fillSpans?: boolean;
}

export const getUPlotChartOptions = ({
	id,
	dimensions,
	isDarkMode,
	apiResponse,
	onDragSelect,
	yAxisUnit,
	onClickHandler = _noop,
	graphsVisibilityStates,
	setGraphsVisibilityStates,
	thresholds,
	fillSpans,
}: GetUPlotChartOptions): uPlot.Options => {
	// eslint-disable-next-line sonarjs/prefer-immediate-return
	const chartOptions = {
		id,
		width: dimensions.width,
		height: dimensions.height - 45,
		// tzDate: (ts) => uPlot.tzDate(new Date(ts * 1e3), ''), //  Pass timezone for 2nd param
		legend: {
			show: true,
			live: false,
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
				size: (u, seriesIdx): number => u.series[seriesIdx].points.size * 2.5,
				width: (u, seriesIdx, size): number => size / 4,
				stroke: (u, seriesIdx): string =>
					`${u.series[seriesIdx].points.stroke(u, seriesIdx)}90`,
				fill: (): string => '#fff',
			},
		},
		padding: [16, 16, 16, 16],
		scales: {
			x: {
				time: true,
				auto: true, // Automatically adjust scale range
			},
			y: {
				auto: true,
			},
		},
		plugins: [
			tooltipPlugin(apiResponse, yAxisUnit, fillSpans),
			onClickPlugin({
				onClick: onClickHandler,
			}),
		],
		hooks: {
			draw: [
				(u): void => {
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
								const textY = yPos - 15;
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
						const seriesEls = legend.querySelectorAll('.u-label');
						const seriesArray = Array.from(seriesEls);
						seriesArray.forEach((seriesEl, index) => {
							seriesEl.addEventListener('click', () => {
								if (graphsVisibilityStates) {
									setGraphsVisibilityStates?.((prev) => {
										const newGraphVisibilityStates = [...prev];
										newGraphVisibilityStates[index + 1] = !newGraphVisibilityStates[
											index + 1
										];
										return newGraphVisibilityStates;
									});
								}
							});
						});
					}
				},
			],
		},
		series: getSeries(
			apiResponse,
			apiResponse?.data.result,
			graphsVisibilityStates,
			fillSpans,
		),
		axes: getAxes(isDarkMode, yAxisUnit),
	};

	return chartOptions;
};
