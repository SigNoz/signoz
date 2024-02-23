/* eslint-disable sonarjs/cognitive-complexity */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

import { drawStyles, lineInterpolations } from './constants';
import { generateColor } from './generateColor';
import getRenderer from './getRenderer';

const paths = (
	u: any,
	seriesIdx: number,
	idx0: number,
	idx1: number,
	extendGap: boolean,
	buildClip: boolean,
): any => {
	const s = u.series[seriesIdx];
	const style = s.drawStyle;
	const interp = s.lineInterpolation;

	const renderer = getRenderer(style, interp);

	return renderer(u, seriesIdx, idx0, idx1, extendGap, buildClip);
};

const getSeries = ({
	apiResponse,
	widgetMetaData,
	graphsVisibilityStates,
	panelType,
}: GetSeriesProps): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = apiResponse?.data.result || [];

	const sortedSeriesList = seriesList.sort((a, b) => {
		const avgA =
			a.values.reduce((acc, curr) => acc + parseFloat(curr[1]), 0) /
			a.values.length;
		const avgB =
			b.values.reduce((acc, curr) => acc + parseFloat(curr[1]), 0) /
			b.values.length;
		return avgB - avgA;
	});

	const newGraphVisibilityStates = graphsVisibilityStates?.slice(1);

	for (let i = 0; i < sortedSeriesList?.length; i += 1) {
		const { metric = {}, queryName = '', legend = '' } = widgetMetaData[i] || {};

		const label = getLabelName(
			metric,
			queryName || '', // query
			legend || '',
		);

		const color = generateColor(label, themeColors.chartcolors);

		const pointSize = sortedSeriesList[i].values.length > 1 ? 5 : 10;
		const showPoints = !(sortedSeriesList[i].values.length > 1);

		const seriesObj: any = {
			paths,
			drawStyle:
				panelType && panelType === PANEL_TYPES.BAR
					? drawStyles.bars
					: drawStyles.line,
			lineInterpolation:
				panelType && panelType === PANEL_TYPES.BAR
					? null
					: lineInterpolations.spline,
			show: newGraphVisibilityStates ? newGraphVisibilityStates[i] : true,
			label,
			fill: panelType && panelType === PANEL_TYPES.BAR ? `${color}40` : undefined,
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

export type GetSeriesProps = {
	apiResponse?: MetricRangePayloadProps;
	widgetMetaData: QueryData[];
	graphsVisibilityStates?: boolean[];
	panelType?: PANEL_TYPES;
};

export default getSeries;
