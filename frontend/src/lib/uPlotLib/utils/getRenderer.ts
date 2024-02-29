import uPlot from 'uplot';

import { drawStyles, lineInterpolations } from './constants';

const { spline: splinePath, bars: barsPath } = uPlot.paths;

const spline = splinePath && splinePath();
const bars = barsPath && barsPath();

const getRenderer = (style: any, interp: any): any => {
	if (style === drawStyles.line && interp === lineInterpolations.spline) {
		return spline;
	}

	if (style === drawStyles.bars) {
		return bars;
	}

	return null;
};

export default getRenderer;
