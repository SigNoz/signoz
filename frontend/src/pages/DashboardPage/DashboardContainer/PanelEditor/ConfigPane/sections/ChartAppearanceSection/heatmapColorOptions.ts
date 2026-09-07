import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
} from 'api/generated/services/sigNoz.schemas';
import { HEATMAP_PALETTE_MAP } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { getPaletteStops } from 'lib/uPlotV2/plugins/HeatmapPlugin/palettes';

import type { ConfigSegmentedItem } from '../../controls/ConfigSegmented/ConfigSegmented';
import type { ConfigSelectItem } from '../../controls/ConfigSelect/ConfigSelect';

export const COLOR_MODE_OPTIONS: ConfigSegmentedItem[] = [
	{ value: DashboardtypesHeatmapColorModeDTO.palette, label: 'Palette' },
	{ value: DashboardtypesHeatmapColorModeDTO.opacity, label: 'Opacity' },
];

// Log first: counts across a distribution's buckets routinely span decades, and a
// linear ramp leaves everything but the modal bucket at one end of it.
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

export const PALETTE_OPTIONS: ConfigSelectItem<DashboardtypesHeatmapPaletteDTO>[] =
	[
		{ value: DashboardtypesHeatmapPaletteDTO.ice, label: 'Ice' },
		{ value: DashboardtypesHeatmapPaletteDTO.moss, label: 'Moss' },
		{ value: DashboardtypesHeatmapPaletteDTO.rust, label: 'Rust' },
		{ value: DashboardtypesHeatmapPaletteDTO.graphite, label: 'Graphite' },
		{ value: DashboardtypesHeatmapPaletteDTO.ember, label: 'Ember' },
		{ value: DashboardtypesHeatmapPaletteDTO.lagoon, label: 'Lagoon' },
		{ value: DashboardtypesHeatmapPaletteDTO.orchid, label: 'Orchid' },
		{ value: DashboardtypesHeatmapPaletteDTO.verdant, label: 'Verdant' },
		{ value: DashboardtypesHeatmapPaletteDTO.lava, label: 'Lava' },
		{ value: DashboardtypesHeatmapPaletteDTO.beacon, label: 'Beacon' },
	];

/**
 * `background` for a palette's preview swatch: the ramp itself, in the order the
 * grid will draw it, so the swatch reads low-count-first like the colour bar.
 */
export function paletteGradient(
	palette: DashboardtypesHeatmapPaletteDTO,
	isDarkMode: boolean,
): string {
	const stops = getPaletteStops(HEATMAP_PALETTE_MAP[palette], isDarkMode);
	return `linear-gradient(90deg, ${stops.join(', ')})`;
}
