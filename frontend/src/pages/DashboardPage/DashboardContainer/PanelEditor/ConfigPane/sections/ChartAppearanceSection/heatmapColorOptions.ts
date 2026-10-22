import { Color } from '@signozhq/design-tokens';
import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	HEATMAP_COLOR_MODE_MAP,
	HEATMAP_COLOR_SCALE_MAP,
	HEATMAP_PALETTE_MAP,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { DEFAULT_HEATMAP_COLORS } from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import { getPaletteStops } from 'lib/uPlotV2/plugins/HeatmapPlugin/palettes';

import type { ColorSwatchOption } from '../../controls/ColorSwatches/ColorSwatches';
import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

function dtoFor<D extends string, V>(map: Record<D, V>, value: V): D {
	return (Object.keys(map) as D[]).find((key) => map[key] === value) as D;
}

/** What the chart draws for an unset field, in spec terms. */
export const DEFAULT_COLOR_MODE = dtoFor(
	HEATMAP_COLOR_MODE_MAP,
	DEFAULT_HEATMAP_COLORS.mode,
);
export const DEFAULT_COLOR_SCALE = dtoFor(
	HEATMAP_COLOR_SCALE_MAP,
	DEFAULT_HEATMAP_COLORS.scale,
);
export const DEFAULT_PALETTE = dtoFor(
	HEATMAP_PALETTE_MAP,
	DEFAULT_HEATMAP_COLORS.palette,
);

export const COLOR_MODE_OPTIONS: ConfigTileItem<DashboardtypesHeatmapColorModeDTO>[] =
	[
		{
			value: DashboardtypesHeatmapColorModeDTO.palette,
			label: 'Palette',
			drawing: TILE_DRAWINGS.colorPalette,
		},
		{
			value: DashboardtypesHeatmapColorModeDTO.opacity,
			label: 'Opacity',
			drawing: TILE_DRAWINGS.colorOpacity,
		},
	];

export const COLOR_MODE_HELP: Record<
	DashboardtypesHeatmapColorModeDTO,
	string
> = {
	palette: 'Each count maps to a color on a multi-color ramp.',
	opacity: 'One color fades from clear to solid.',
};

// Log first: bucket counts routinely span decades.
export const COLOR_SCALE_OPTIONS: ConfigTileItem<DashboardtypesHeatmapColorScaleDTO>[] =
	[
		{
			value: DashboardtypesHeatmapColorScaleDTO.log,
			label: 'Log',
			drawing: TILE_DRAWINGS.scaleLog,
		},
		{
			value: DashboardtypesHeatmapColorScaleDTO.sqrt,
			label: 'Square root',
			drawing: TILE_DRAWINGS.scaleSqrt,
		},
		{
			value: DashboardtypesHeatmapColorScaleDTO.linear,
			label: 'Linear',
			drawing: TILE_DRAWINGS.scaleLinear,
		},
	];

export const COLOR_SCALE_HELP: Record<
	DashboardtypesHeatmapColorScaleDTO,
	string
> = {
	log: 'Keeps sparse buckets visible next to busy ones.',
	sqrt: 'A middle ground between Log and Linear.',
	linear: 'Color changes evenly with count.',
};

/** The unset fill: each group ramps its own legend colour. */
export const GROUP_FILL = '';

/** Opacity-mode base colours: the palette values that read on both themes. */
export const FILL_OPTIONS: ColorSwatchOption<string>[] = [
	{
		value: GROUP_FILL,
		id: 'group',
		label: 'Group color',
		tooltip: 'Each group’s own color',
		fill: `conic-gradient(${Color.BG_ROBIN_400}, ${Color.BG_AQUA_400}, ${Color.BG_FOREST_400}, ${Color.BG_SIENNA_400}, ${Color.BG_ROBIN_400})`,
	},
	...[
		{ id: 'robin', color: Color.BG_ROBIN_400 },
		{ id: 'aqua', color: Color.BG_AQUA_400 },
		{ id: 'forest', color: Color.BG_FOREST_400 },
		{ id: 'sienna', color: Color.BG_SIENNA_400 },
	].map(({ id, color }) => ({
		value: color,
		id,
		label: id.charAt(0).toUpperCase() + id.slice(1),
		fill: color,
	})),
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
