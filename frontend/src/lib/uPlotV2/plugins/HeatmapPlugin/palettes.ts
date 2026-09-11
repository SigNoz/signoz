import { HeatmapColorPalette } from './types';

interface PaletteDefinition {
	/** Evenly spaced, one end of the ramp to the other. */
	stops: string[];
	/** `true` when `stops[0]` is the dark end. */
	darkFirst: boolean;
}

/**
 * Stop values come from the long-established public palette families —
 * ColorBrewer for the hue ramps, matplotlib's perceptual set for the rest.
 */
const PALETTES: Record<HeatmapColorPalette, PaletteDefinition> = {
	[HeatmapColorPalette.Ice]: {
		darkFirst: false,
		stops: [
			'#f7fbff',
			'#deebf7',
			'#c3dbee',
			'#9cc8e2',
			'#6daed5',
			'#4391c6',
			'#2271b4',
			'#0c5198',
			'#08306b',
		],
	},
	[HeatmapColorPalette.Moss]: {
		darkFirst: false,
		stops: [
			'#f7fcf5',
			'#e3f4de',
			'#c6e8bf',
			'#a0d89b',
			'#73c378',
			'#45aa5d',
			'#228b45',
			'#066b2d',
			'#00441b',
		],
	},
	[HeatmapColorPalette.Rust]: {
		darkFirst: false,
		stops: [
			'#fff5f0',
			'#feddcf',
			'#fcbaa1',
			'#fc9273',
			'#f9694c',
			'#eb3d2f',
			'#cb1c1e',
			'#a10e15',
			'#67000d',
		],
	},
	[HeatmapColorPalette.Graphite]: {
		darkFirst: false,
		stops: [
			'#ffffff',
			'#efefef',
			'#d8d8d8',
			'#bbbbbb',
			'#979797',
			'#737373',
			'#505050',
			'#262626',
			'#000000',
		],
	},
	[HeatmapColorPalette.Ember]: {
		darkFirst: false,
		stops: [
			'#ffffcc',
			'#ffeda0',
			'#fed676',
			'#feb250',
			'#fd893c',
			'#f8502b',
			'#e11e20',
			'#b90424',
			'#800026',
		],
	},
	[HeatmapColorPalette.Lagoon]: {
		darkFirst: false,
		stops: [
			'#ffffd9',
			'#eaf7b8',
			'#c1e7b5',
			'#81cebb',
			'#45b4c2',
			'#248fbd',
			'#2260a9',
			'#20378d',
			'#081d58',
		],
	},
	[HeatmapColorPalette.Orchid]: {
		darkFirst: false,
		stops: [
			'#fff7f3',
			'#fddfdc',
			'#fcc3c3',
			'#fa9cb4',
			'#f369a3',
			'#da3495',
			'#ad0a81',
			'#7b0176',
			'#49006a',
		],
	},
	[HeatmapColorPalette.Verdant]: {
		darkFirst: true,
		stops: [
			'#440154',
			'#472d7b',
			'#3b528b',
			'#2c728e',
			'#21918c',
			'#28ae80',
			'#5ec962',
			'#addc30',
			'#fde725',
		],
	},
	[HeatmapColorPalette.Lava]: {
		darkFirst: true,
		stops: [
			'#000004',
			'#1d1147',
			'#51127c',
			'#832681',
			'#b73779',
			'#e75263',
			'#fc8961',
			'#fec488',
			'#fcfdbf',
		],
	},
	[HeatmapColorPalette.Beacon]: {
		darkFirst: true,
		stops: [
			'#002051',
			'#11366c',
			'#3c4d6e',
			'#62646f',
			'#7f7c75',
			'#9a9478',
			'#bbaf71',
			'#e2cb5c',
			'#fdea45',
		],
	},
};

/** Stops oriented low-count first for the active theme. At the wrong polarity,
 *  empty cells become the loudest thing on screen. */
export function getPaletteStops(
	palette: HeatmapColorPalette,
	isDarkMode: boolean,
): string[] {
	const definition = PALETTES[palette] ?? PALETTES[HeatmapColorPalette.Ice];
	return definition.darkFirst === isDarkMode
		? definition.stops
		: [...definition.stops].reverse();
}
