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

export const uPlotXAxisValuesFormat = [
	[3600 * 24 * 365, '{YYYY}', null, null, null, null, null, null, 1],
	[3600 * 24 * 28, '{MMM}', '\n{YYYY}', null, null, null, null, null, 1],
	[3600 * 24, '{M}/{D}', '\n{YYYY}', null, null, null, null, null, 1],
	[3600, '{HH}:{mm}', '\n{M}/{D}/{YY}', null, '\n{M}/{D}', null, null, null, 1],
	[60, '{HH}:{mm}', '\n{M}/{D}/{YY}', null, '\n{M}/{D}', null, null, null, 1],
	[
		1,
		':{ss}',
		'\n{M}/{D}/{YY} {HH}:{mm}',
		null,
		'\n{M}/{D} {HH}:{mm}',
		null,
		'\n{HH}:{mm}',
		null,
		1,
	],
	[
		0.001,
		':{ss}.{fff}',
		'\n{M}/{D}/{YY} {HH}:{mm}',
		null,
		'\n{M}/{D} {HH}:{mm}',
		null,
		'\n{HH}:{mm}',
		null,
		1,
	],
];
