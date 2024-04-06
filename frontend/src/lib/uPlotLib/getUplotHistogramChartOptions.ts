import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { Dimensions } from 'hooks/useDimensions';
import getLabelName from 'lib/getLabelName';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

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
};

type GetHistogramSeriesProps = {
	apiResponse?: MetricRangePayloadProps;
	currentQuery?: Query;
	widgetMetaData?: QueryData[];
};

const { bars } = uPlot.paths;

const paths = (u: any, seriesIdx: number, idx0: number, idx1: number): any => {
	const renderer = bars && bars({ size: [1], align: -1 });

	return renderer && renderer(u, seriesIdx, idx0, idx1);
};

const getHistogramSeries = ({
	apiResponse,
	currentQuery,
	widgetMetaData,
}: GetHistogramSeriesProps): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];
	const seriesList = apiResponse?.data.result || [];

	for (let i = 0; i < seriesList?.length; i += 1) {
		const { metric = {}, queryName = '', legend: lgd } =
			(widgetMetaData && widgetMetaData[i]) || {};

		const newLegend =
			currentQuery?.builder.queryData.find((item) => item.queryName === queryName)
				?.legend || '';

		const legend = newLegend || lgd || '';

		const label = getLabelName(metric, queryName || '', legend);

		const color = generateColor(label, themeColors.chartcolors);

		const pointSize = seriesList[i].values.length > 1 ? 5 : 10;
		const showPoints = !(seriesList[i].values.length > 1);

		const seriesObj: any = {
			paths,
			drawStyle: drawStyles.bars,
			lineInterpolation: null,
			show: true,
			label,
			fill: `${color}40`,
			stroke: color,
			width: 2,
			spanGaps: true,
			points: {
				size: pointSize,
				show: showPoints,
				stroke: color,
			},
		};

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
}: GetUplotHistogramChartOptionsProps): uPlot.Options =>
	({
		id,
		width: dimensions.width,
		height: dimensions.height,
		legend: {
			show: false,
			live: false,
			isolate: true,
		},
		focus: {
			alpha: 0.3,
		},
		padding: [16, 16, 8, 8],
		plugins: [tooltipPlugin(apiResponse)],
		scales: {
			x: {
				time: false,
				auto: true,
			},
			y: {
				auto: true,
			},
		},
		series: getHistogramSeries({
			apiResponse,
			widgetMetaData: apiResponse?.data.result,
			currentQuery,
		}),
		axes: getAxes(isDarkMode),
	} as uPlot.Options);
