import { DashboardtypesStackModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

export enum BarLayout {
	SIDE_BY_SIDE = 'side',
	STACKED = 'stacked',
}

export const BAR_LAYOUT_OPTIONS: ConfigTileItem<BarLayout>[] = [
	{
		value: BarLayout.SIDE_BY_SIDE,
		label: 'Side by side',
		drawing: TILE_DRAWINGS.barsSideBySide,
	},
	{
		value: BarLayout.STACKED,
		label: 'Stacked',
		drawing: TILE_DRAWINGS.barsStacked,
	},
];

export const BAR_LAYOUT_HELP: Record<BarLayout, string> = {
	[BarLayout.SIDE_BY_SIDE]:
		'Each series gets its own bar, side by side, for easy comparison.',
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
