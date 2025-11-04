/* eslint-disable sonarjs/cognitive-complexity */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { saveLegendEntriesToLocalStorage } from 'container/GridCardLayout/GridCard/FullView/utils';
import { Dimensions } from 'hooks/useDimensions';
import getLabelName from 'lib/getLabelName';
import _noop from 'lodash-es/noop';
import { Dispatch, SetStateAction } from 'react';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import onClickPlugin, { OnClickPluginOpts } from './plugins/onClickPlugin';
import tooltipPlugin from './plugins/tooltipPlugin';
import { drawStyles } from './utils/constants';
import { generateColor } from './utils/generateColor';
import getAxes from './utils/getAxes';

// Extended uPlot interface with custom properties
interface ExtendedUPlot extends uPlot {
	_legendScrollCleanup?: () => void;
}

type GetUplotHistogramChartOptionsProps = {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	histogramData: uPlot.AlignedData;
	dimensions: Dimensions;
	isDarkMode: boolean;
	panelType?: PANEL_TYPES;
	onDragSelect?: (startTime: number, endTime: number) => void;
	currentQuery?: Query;
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates?: Dispatch<SetStateAction<boolean[]>>;
	mergeAllQueries?: boolean;
	onClickHandler?: OnClickPluginOpts['onClick'];
	legendScrollPosition?: number;
	setLegendScrollPosition?: (position: number) => void;
};

type GetHistogramSeriesProps = {
	apiResponse?: MetricRangePayloadProps;
	currentQuery?: Query;
	widgetMetaData?: QueryData[];
	graphsVisibilityStates?: boolean[];
	isMergedSeries?: boolean;
	isDarkMode: boolean;
};

const { bars } = uPlot.paths;

const paths = (
	u: uPlot,
	seriesIdx: number,
	idx0: number,
	idx1: number,
): uPlot.Series.Paths | null | undefined => {
	const renderer = bars && bars({ size: [1], align: -1 });

	return renderer && renderer(u, seriesIdx, idx0, idx1);
};

const getHistogramSeries = ({
	apiResponse,
	currentQuery,
	widgetMetaData,
	graphsVisibilityStates,
	isMergedSeries,
	isDarkMode,
}: GetHistogramSeriesProps): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];
	const seriesList = apiResponse?.data.result || [];

	const newGraphVisibilityStates = graphsVisibilityStates?.slice(1);

	for (let i = 0; i < seriesList?.length; i += 1) {
		const { metric = {}, queryName = '', legend: lgd } =
			(widgetMetaData && widgetMetaData[i]) || {};

		const newLegend =
			currentQuery?.builder.queryData.find((item) => item.queryName === queryName)
				?.legend || '';

		const legend = newLegend || lgd || '';

		const label = isMergedSeries
			? ''
			: getLabelName(metric, queryName || '', legend);

		const color = generateColor(
			label,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		);

		const pointSize = seriesList[i].values.length > 1 ? 5 : 10;
		const showPoints = !(seriesList[i].values.length > 1);

		const seriesObj: uPlot.Series = {
			paths,
			drawStyle: drawStyles.bars,
			lineInterpolation: null,
			show: newGraphVisibilityStates ? newGraphVisibilityStates[i] : true,
			label,
			fill: `${color}40`,
			stroke: color,
			width: 2,
			points: {
				size: pointSize,
				show: showPoints,
				stroke: color,
			},
		} as uPlot.Series;

		configurations.push(seriesObj);
	}

	return configurations;
};

export const getUplotHistogramChartOptions = ({
	id,
	dimensions,
	isDarkMode,
	apiResponse,
	currentQuery,
	graphsVisibilityStates,
	setGraphsVisibilityStates,
	mergeAllQueries,
	onClickHandler = _noop,
	panelType,
	legendScrollPosition,
	setLegendScrollPosition,
}: GetUplotHistogramChartOptionsProps): uPlot.Options =>
	({
		id,
		width: dimensions.width,
		height: dimensions.height - 30,
		legend: {
			show: !mergeAllQueries,
			live: false,
			isolate: true,
		},
		focus: {
			alpha: 0.3,
		},
		padding: [16, 16, 8, 8],
		plugins: [
			tooltipPlugin({
				apiResponse,
				isHistogramGraphs: true,
				isMergedSeries: mergeAllQueries,
				isDarkMode,
			}),
			onClickPlugin({
				onClick: onClickHandler,
				apiResponse,
			}),
		],
		scales: {
			x: {
				time: false,
				auto: true,
			},
			y: {
				auto: true,
			},
		},
		cursor: {
			drag: {
				x: false,
				y: false,
				setScale: true,
			},
		},
		series: getHistogramSeries({
			apiResponse,
			widgetMetaData: apiResponse?.data.result,
			currentQuery,
			graphsVisibilityStates,
			isMergedSeries: mergeAllQueries,
			isDarkMode,
		}),
		hooks: {
			ready: [
				(self): void => {
					const legend = self.root.querySelector('.u-legend');
					if (legend) {
						const legendElement = legend as HTMLElement;

						// Enhanced legend scroll position preservation
						if (setLegendScrollPosition && typeof legendScrollPosition === 'number') {
							const handleScroll = (): void => {
								setLegendScrollPosition(legendElement.scrollTop);
							};

							// Add scroll event listener to save position
							legendElement.addEventListener('scroll', handleScroll);

							// Restore scroll position
							requestAnimationFrame(() => {
								legendElement.scrollTop = legendScrollPosition;
							});

							// Store cleanup function
							const extSelf = self as ExtendedUPlot;
							extSelf._legendScrollCleanup = (): void => {
								legendElement.removeEventListener('scroll', handleScroll);
							};
						}

						const seriesEls = legend.querySelectorAll('.u-series');
						const seriesArray = Array.from(seriesEls);
						seriesArray.forEach((seriesEl, index) => {
							// Add click handlers for marker and text separately
							const thElement = seriesEl.querySelector('th');
							if (thElement) {
								const currentMarker = thElement.querySelector('.u-marker');
								const textElement =
									thElement.querySelector('.legend-text') || thElement;

								// Marker click handler - checkbox behavior (toggle individual series)
								if (currentMarker) {
									currentMarker.addEventListener('click', (e) => {
										e.stopPropagation?.(); // Prevent event bubbling to text handler

										if (graphsVisibilityStates) {
											setGraphsVisibilityStates?.((prev) => {
												const newGraphVisibilityStates = [...prev];
												// Toggle the specific series visibility (checkbox behavior)
												newGraphVisibilityStates[index + 1] = !newGraphVisibilityStates[
													index + 1
												];

												saveLegendEntriesToLocalStorage({
													options: self,
													graphVisibilityState: newGraphVisibilityStates,
													name: id || '',
												});
												return newGraphVisibilityStates;
											});
										}
									});
								}

								// Text click handler - show only/show all behavior (existing behavior)
								textElement.addEventListener('click', (e) => {
									e.stopPropagation?.(); // Prevent event bubbling

									if (graphsVisibilityStates) {
										setGraphsVisibilityStates?.((prev) => {
											const newGraphVisibilityStates = [...prev];
											// Show only this series / show all behavior
											if (
												newGraphVisibilityStates[index + 1] &&
												newGraphVisibilityStates.every((value, i) =>
													i === index + 1 ? value : !value,
												)
											) {
												// If only this series is visible, show all
												newGraphVisibilityStates.fill(true);
											} else {
												// Otherwise, show only this series
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
							}
						});
					}
				},
			],
		},
		axes: getAxes({ isDarkMode, panelType }),
	} as uPlot.Options);
