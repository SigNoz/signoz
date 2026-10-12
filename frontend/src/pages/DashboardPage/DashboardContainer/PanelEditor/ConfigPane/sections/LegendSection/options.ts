import { DashboardtypesLegendPositionDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

export const POSITION_OPTIONS: ConfigTileItem<DashboardtypesLegendPositionDTO>[] =
	[
		{
			value: DashboardtypesLegendPositionDTO.bottom,
			label: 'Below chart',
			drawing: TILE_DRAWINGS.legendBottom,
		},
		{
			value: DashboardtypesLegendPositionDTO.right,
			label: 'Right of chart',
			drawing: TILE_DRAWINGS.legendRight,
		},
	];
