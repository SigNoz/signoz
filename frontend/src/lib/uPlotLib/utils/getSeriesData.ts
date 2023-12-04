import getLabelName from 'lib/getLabelName';
import { colors } from 'lib/getRandomColor';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

import getRenderer, { drawStyles, lineInterpolations } from './getRenderer';

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

const getSeries = (
	apiResponse?: MetricRangePayloadProps,
	widgetMetaData: QueryData[] = [],
	graphsVisibilityStates?: boolean[],
): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = apiResponse?.data.result || [];

	const newGraphVisibilityStates = graphsVisibilityStates?.slice(1);

	for (let i = 0; i < seriesList?.length; i += 1) {
		const color = colors[i % colors.length]; // Use modulo to loop through colors if there are more series than colors

		const { metric = {}, queryName = '', legend = '' } = widgetMetaData[i] || {};

		const label = getLabelName(
			metric,
			queryName || '', // query
			legend || '',
		);

		const seriesObj: any = {
			paths,
			drawStyle: drawStyles.line,
			lineInterpolation: lineInterpolations.spline,
			show: newGraphVisibilityStates ? newGraphVisibilityStates[i] : true,
			label,
			stroke: color,
			width: 2,
			spanGaps: true,
			points: {
				size: seriesList[i].values.length >= 1 ? 2 : 10,
				show: true,
				stroke: color,
				fill: color,
			},
		};

		configurations.push(seriesObj);
	}

	return configurations;
};

export default getSeries;
