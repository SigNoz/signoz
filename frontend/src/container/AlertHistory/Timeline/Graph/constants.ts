import { Color } from '@signozhq/design-tokens';

export const ALERT_STATUS: { [key: string]: number } = {
	firing: 0,
	inactive: 1,
	normal: 1,
	'no-data': 2,
	disabled: 3,
	muted: 4,
};

export const STATE_VS_COLOR: {
	[key: string]: { stroke: string; fill: string };
}[] = [
	{},
	{
		0: { stroke: Color.BG_CHERRY_500, fill: Color.BG_CHERRY_500 },
		1: { stroke: Color.BG_FOREST_500, fill: Color.BG_FOREST_500 },
		2: { stroke: Color.BG_SIENNA_400, fill: Color.BG_SIENNA_400 },
		3: { stroke: Color.BG_VANILLA_400, fill: Color.BG_VANILLA_400 },
		4: { stroke: Color.BG_INK_100, fill: Color.BG_INK_100 },
	},
];

export const TIMELINE_OPTIONS = {
	mode: 1,
	fill: (seriesIdx: any, _: any, value: any): any =>
		STATE_VS_COLOR[seriesIdx][value].fill,
	stroke: (seriesIdx: any, _: any, value: any): any =>
		STATE_VS_COLOR[seriesIdx][value].stroke,
	laneWidthOption: 0.3,
	showGrid: false,
};
