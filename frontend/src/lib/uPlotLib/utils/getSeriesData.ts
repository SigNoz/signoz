/* eslint-disable sonarjs/cognitive-complexity */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { isUndefined } from 'lodash-es';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
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
	series,
	widgetMetaData,
	graphsVisibilityStates,
	panelType,
	hiddenGraph,
	isDarkMode,
}: GetSeriesProps): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = series || [];

	const newGraphVisibilityStates = graphsVisibilityStates?.slice(1);

	for (let i = 0; i < seriesList?.length; i += 1) {
		const { metric = {}, queryName = '', legend = '' } = widgetMetaData[i] || {};

		const label = getLabelName(
			metric,
			queryName || '', // query
			legend || '',
		);

		const color = generateColor(
			label,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		);

		const pointSize = seriesList[i].values.length > 1 ? 5 : 10;
		const showPoints = !(seriesList[i].values.length > 1);

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
			// eslint-disable-next-line no-nested-ternary
			show: newGraphVisibilityStates
				? newGraphVisibilityStates[i]
				: !isUndefined(hiddenGraph)
				? hiddenGraph[i]
				: true,
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
	series?: QueryData[];
	widgetMetaData: QueryData[];
	isDarkMode: boolean;
	graphsVisibilityStates?: boolean[];
	panelType?: PANEL_TYPES;
	currentQuery?: Query;
	stackBarChart?: boolean;
	hiddenGraph?: {
		[key: string]: boolean;
	};
};

export default getSeries;
