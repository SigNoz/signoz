import uPlot from 'uplot';

// Define type annotations for style and interp
export const drawStyles = {
	line: 'line',
	bars: 'bars',
	barsLeft: 'barsLeft',
	barsRight: 'barsRight',
	points: 'points',
};

export const lineInterpolations = {
	linear: 'linear',
	stepAfter: 'stepAfter',
	stepBefore: 'stepBefore',
	spline: 'spline',
};

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
