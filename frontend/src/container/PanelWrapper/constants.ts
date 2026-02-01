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

export const HEATMAP_COLOR_GRADIENTS = {
	default: [
		{ position: 0.0, color: [68, 1, 84] as [number, number, number] },
		{ position: 0.25, color: [59, 82, 139] as [number, number, number] },
		{ position: 0.5, color: [33, 145, 140] as [number, number, number] },
		{ position: 0.75, color: [253, 231, 37] as [number, number, number] },
		{ position: 1.0, color: [255, 87, 51] as [number, number, number] },
	],
	viridis: [
		{ position: 0.0, color: [68, 1, 84] as [number, number, number] },
		{ position: 0.25, color: [59, 82, 139] as [number, number, number] },
		{ position: 0.5, color: [33, 145, 140] as [number, number, number] },
		{ position: 0.75, color: [94, 201, 98] as [number, number, number] },
		{ position: 1.0, color: [253, 231, 37] as [number, number, number] },
	],
	plasma: [
		{ position: 0.0, color: [13, 8, 135] as [number, number, number] },
		{ position: 0.25, color: [126, 3, 168] as [number, number, number] },
		{ position: 0.5, color: [204, 71, 120] as [number, number, number] },
		{ position: 0.75, color: [248, 149, 64] as [number, number, number] },
		{ position: 1.0, color: [240, 249, 33] as [number, number, number] },
	],
	inferno: [
		{ position: 0.0, color: [0, 0, 4] as [number, number, number] },
		{ position: 0.25, color: [87, 16, 110] as [number, number, number] },
		{ position: 0.5, color: [188, 55, 84] as [number, number, number] },
		{ position: 0.75, color: [249, 142, 9] as [number, number, number] },
		{ position: 1.0, color: [252, 255, 164] as [number, number, number] },
	],
	turbo: [
		{ position: 0.0, color: [48, 18, 59] as [number, number, number] },
		{ position: 0.2, color: [33, 102, 172] as [number, number, number] },
		{ position: 0.4, color: [53, 183, 121] as [number, number, number] },
		{ position: 0.6, color: [164, 216, 43] as [number, number, number] },
		{ position: 0.8, color: [249, 142, 9] as [number, number, number] },
		{ position: 1.0, color: [249, 248, 113] as [number, number, number] },
	],
	cool: [
		{ position: 0.0, color: [0, 32, 77] as [number, number, number] },
		{ position: 0.33, color: [0, 92, 156] as [number, number, number] },
		{ position: 0.67, color: [0, 163, 224] as [number, number, number] },
		{ position: 1.0, color: [72, 219, 251] as [number, number, number] },
	],
	magma: [
		{ position: 0.0, color: [0, 0, 4] as [number, number, number] },
		{ position: 0.25, color: [81, 18, 124] as [number, number, number] },
		{ position: 0.5, color: [182, 54, 121] as [number, number, number] },
		{ position: 0.75, color: [251, 136, 97] as [number, number, number] },
		{ position: 1.0, color: [252, 253, 191] as [number, number, number] },
	],
	spectral: [
		{ position: 0.0, color: [94, 79, 162] as [number, number, number] },
		{ position: 0.25, color: [50, 136, 189] as [number, number, number] },
		{ position: 0.5, color: [171, 221, 164] as [number, number, number] },
		{ position: 0.75, color: [254, 224, 139] as [number, number, number] },
		{ position: 1.0, color: [215, 48, 39] as [number, number, number] },
	],
} as const;

export type HeatmapColorPaletteKey = keyof typeof HEATMAP_COLOR_GRADIENTS;
