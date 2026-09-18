import { Color } from '@signozhq/design-tokens';
import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
} from 'api/generated/services/sigNoz.schemas';
import { HEATMAP_PALETTE_MAP } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { getPaletteStops } from 'lib/uPlotV2/plugins/HeatmapPlugin/palettes';

import type { ConfigSegmentedItem } from '../../controls/ConfigSegmented/ConfigSegmented';

export const COLOR_MODE_OPTIONS: ConfigSegmentedItem[] = [
	{ value: DashboardtypesHeatmapColorModeDTO.palette, label: 'Palette' },
	{ value: DashboardtypesHeatmapColorModeDTO.opacity, label: 'Opacity' },
];

// Log first: bucket counts routinely span decades.
export const COLOR_SCALE_OPTIONS: ConfigSegmentedItem[] = [
	{
		value: DashboardtypesHeatmapColorScaleDTO.log,
		label: 'Log',
		icon: 'scale-log',
	},
	{ value: DashboardtypesHeatmapColorScaleDTO.sqrt, label: 'Sqrt' },
	{
		value: DashboardtypesHeatmapColorScaleDTO.linear,
		label: 'Linear',
		icon: 'scale-linear',
	},
];

export interface HeatmapFillPreset {
	label: string;
	color: string;
}

/** Opacity-mode base colours: the palette values that read on both themes. */
export const FILL_PRESETS: HeatmapFillPreset[] = [
	{ label: 'robin', color: Color.BG_ROBIN_400 },
	{ label: 'aqua', color: Color.BG_AQUA_400 },
	{ label: 'forest', color: Color.BG_FOREST_400 },
	{ label: 'sienna', color: Color.BG_SIENNA_400 },
];

/** Hex comparison for a spec value that may differ only in case. */
export function isSameColor(
	left: string | undefined,
	right: string | undefined,
): boolean {
	return Boolean(left) && left?.toLowerCase() === right?.toLowerCase();
}

export interface HeatmapPaletteOption {
	value: DashboardtypesHeatmapPaletteDTO;
	label: string;
}

export const PALETTE_OPTIONS: HeatmapPaletteOption[] = [
	{ value: DashboardtypesHeatmapPaletteDTO.ice, label: 'ice' },
	{ value: DashboardtypesHeatmapPaletteDTO.moss, label: 'moss' },
	{ value: DashboardtypesHeatmapPaletteDTO.rust, label: 'rust' },
	{ value: DashboardtypesHeatmapPaletteDTO.graphite, label: 'graphite' },
	{ value: DashboardtypesHeatmapPaletteDTO.ember, label: 'ember' },
	{ value: DashboardtypesHeatmapPaletteDTO.lagoon, label: 'lagoon' },
	{ value: DashboardtypesHeatmapPaletteDTO.orchid, label: 'orchid' },
	{ value: DashboardtypesHeatmapPaletteDTO.verdant, label: 'verdant' },
	{ value: DashboardtypesHeatmapPaletteDTO.lava, label: 'lava' },
	{ value: DashboardtypesHeatmapPaletteDTO.beacon, label: 'beacon' },
];

/** `background` for a palette's card, low-count-first like the colour bar. */
export function paletteGradient(
	palette: DashboardtypesHeatmapPaletteDTO,
	isDarkMode: boolean,
): string {
	const stops = getPaletteStops(HEATMAP_PALETTE_MAP[palette], isDarkMode);
	return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** `background` for a resolved ramp: hard-edged bands, one per colour step. */
export function rampGradient(ramp: string[]): string {
	if (ramp.length === 0) {
		return 'transparent';
	}
	if (ramp.length === 1) {
		return ramp[0];
	}
	const stops = ramp.flatMap((color, index) => [
		`${color} ${(index / ramp.length) * 100}%`,
		`${color} ${((index + 1) / ramp.length) * 100}%`,
	]);
	return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** The Slider emits a pair in range mode; these are all single-thumb. */
export function singleSliderValue(value: number | number[]): number {
	return Array.isArray(value) ? value[0] : value;
}
