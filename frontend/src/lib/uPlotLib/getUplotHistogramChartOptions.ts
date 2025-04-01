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
						const seriesEls = legend.querySelectorAll('.u-series');
						const seriesArray = Array.from(seriesEls);
						seriesArray.forEach((seriesEl, index) => {
							seriesEl.addEventListener('click', () => {
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
		axes: getAxes({ isDarkMode, panelType }),
	} as uPlot.Options);
