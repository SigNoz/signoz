import { PANEL_TYPES } from 'constants/queryBuilder';

import HeatmapPanelWrapper from './HeatmapPanelWrapper';
import HistogramPanelWrapper from './HistogramPanelWrapper';
import ListPanelWrapper from './ListPanelWrapper';
import PiePanelWrapper from './PiePanelWrapper';
import TablePanelWrapper from './TablePanelWrapper';
import UplotPanelWrapper from './UplotPanelWrapper';
import ValuePanelWrapper from './ValuePanelWrapper';

export const PanelTypeVsPanelWrapper = {
	[PANEL_TYPES.TIME_SERIES]: UplotPanelWrapper,
	[PANEL_TYPES.TABLE]: TablePanelWrapper,
	[PANEL_TYPES.LIST]: ListPanelWrapper,
	[PANEL_TYPES.VALUE]: ValuePanelWrapper,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
	[PANEL_TYPES.PIE]: PiePanelWrapper,
	[PANEL_TYPES.BAR]: UplotPanelWrapper,
	[PANEL_TYPES.HISTOGRAM]: HistogramPanelWrapper,
	[PANEL_TYPES.HEATMAP]: HeatmapPanelWrapper,
};

export const DEFAULT_BUCKET_COUNT = 30;

// prettier-ignore
export const histogramBucketSizes = [
  1e-9, 2e-9, 2.5e-9, 4e-9, 5e-9,
  1e-8, 2e-8, 2.5e-8, 4e-8, 5e-8,
  1e-7, 2e-7, 2.5e-7, 4e-7, 5e-7,
  1e-6, 2e-6, 2.5e-6, 4e-6, 5e-6,
  1e-5, 2e-5, 2.5e-5, 4e-5, 5e-5,
  1e-4, 2e-4, 2.5e-4, 4e-4, 5e-4,
  1e-3, 2e-3, 2.5e-3, 4e-3, 5e-3,
  1e-2, 2e-2, 2.5e-2, 4e-2, 5e-2,
  1e-1, 2e-1, 2.5e-1, 4e-1, 5e-1,
  1, 2, 4, 5,
  1e+1, 2e+1, 2.5e+1, 4e+1, 5e+1,
  1e+2, 2e+2, 2.5e+2, 4e+2, 5e+2,
  1e+3, 2e+3, 2.5e+3, 4e+3, 5e+3,
  1e+4, 2e+4, 2.5e+4, 4e+4, 5e+4,
  1e+5, 2e+5, 2.5e+5, 4e+5, 5e+5,
  1e+6, 2e+6, 2.5e+6, 4e+6, 5e+6,
  1e+7, 2e+7, 2.5e+7, 4e+7, 5e+7,
  1e+8, 2e+8, 2.5e+8, 4e+8, 5e+8,
  1e+9, 2e+9, 2.5e+9, 4e+9, 5e+9,
];

export const NULL_REMOVE = 0;
export const NULL_RETAIN = 1;
export const NULL_EXPAND = 2;

// color palettes

export const HEATMAP_COLOR_PALETTES = {
	default: [
		'#000000',
		'#0a0612',
		'#140d24',
		'#1f1436',
		'#2a1b48',
		'#35225a',
		'#402a6d',
		'#4d3380',
		'#5b3d93',
		'#6b48a6',
		'#7d54b9',
		'#9062cc',
		'#a572df',
		'#bb84f2',
		'#d298ff',
		'#eab0ff',
	],
	blue: [
		'#000000',
		'#03060a',
		'#070d14',
		'#0a143f',
		'#0e1b4a',
		'#111f55',
		'#152a61',
		'#18336e',
		'#1c3d7c',
		'#1f488b',
		'#23499b',
		'#2659ab',
		'#2a6bbd',
		'#2d7ed0',
		'#33a0e5',
		'#80c3ff',
	],
	green: [
		'#000000',
		'#001203',
		'#002407',
		'#00360a',
		'#00480e',
		'#005a11',
		'#006d15',
		'#008018',
		'#00931c',
		'#00a71f',
		'#00bb23',
		'#00d026',
		'#00e52a',
		'#00fa2d',
		'#33ff55',
		'#80ffaa',
	],
	orange: [
		'#000000',
		'#120600',
		'#240c00',
		'#361200',
		'#481800',
		'#5a1f00',
		'#6d2500',
		'#802b00',
		'#933100',
		'#a73700',
		'#bb3d00',
		'#d04400',
		'#e54a00',
		'#fa5000',
		'#ff6633',
		'#ffaa80',
	],
	red: [
		'#000000',
		'#120000',
		'#240000',
		'#360000',
		'#480000',
		'#5a0000',
		'#6d0000',
		'#800000',
		'#930000',
		'#a70000',
		'#bb0000',
		'#d00000',
		'#e50000',
		'#fa0000',
		'#ff3333',
		'#ff8080',
	],
} as const;

export type HeatmapColorPaletteKey = keyof typeof HEATMAP_COLOR_PALETTES;
