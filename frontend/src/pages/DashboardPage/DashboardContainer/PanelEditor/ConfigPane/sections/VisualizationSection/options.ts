import { DashboardtypesStackModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

export enum BarLayout {
	OVERLAP = 'overlap',
	STACKED = 'stacked',
}

export const BAR_LAYOUT_OPTIONS: ConfigTileItem<BarLayout>[] = [
	{
		value: BarLayout.OVERLAP,
		label: 'Overlap',
		drawing: TILE_DRAWINGS.barsOverlap,
	},
	{
		value: BarLayout.STACKED,
		label: 'Stacked',
		drawing: TILE_DRAWINGS.barsStacked,
	},
];

export const BAR_LAYOUT_HELP: Record<BarLayout, string> = {
	[BarLayout.OVERLAP]: 'Each series is drawn from zero and may hide others.',
	[BarLayout.STACKED]:
		'Bars sit on top of each other, so the height shows the total.',
};

// `percent` rescales each x-slice to its column total; the y axis follows.
export const STACK_MODE_OPTIONS: ConfigTileItem<DashboardtypesStackModeDTO>[] =
	[
		{
			value: DashboardtypesStackModeDTO.none,
			label: 'Overlap',
			drawing: TILE_DRAWINGS.areaOverlap,
		},
		{
			value: DashboardtypesStackModeDTO.normal,
			label: 'Stacked',
			drawing: TILE_DRAWINGS.areaStacked,
		},
		{
			value: DashboardtypesStackModeDTO.percent,
			label: '100%',
			drawing: TILE_DRAWINGS.areaPercent,
		},
	];

export const STACK_MODE_HELP: Record<DashboardtypesStackModeDTO, string> = {
	[DashboardtypesStackModeDTO.none]:
		'Each series is drawn from zero and may hide others.',
	[DashboardtypesStackModeDTO.normal]:
		'Series sit on top of each other, so the top edge shows the total.',
	[DashboardtypesStackModeDTO.percent]:
		'Each series shows its share of the total at every point in time.',
};
