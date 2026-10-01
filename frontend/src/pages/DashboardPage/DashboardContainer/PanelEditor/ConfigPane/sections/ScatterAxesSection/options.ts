import { DashboardtypesAxisScaleDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

export const SCALE_OPTIONS: ConfigTileItem<DashboardtypesAxisScaleDTO>[] = [
	{
		value: DashboardtypesAxisScaleDTO.auto,
		label: 'Auto',
		drawing: TILE_DRAWINGS.scaleAuto,
	},
	{
		value: DashboardtypesAxisScaleDTO.linear,
		label: 'Linear',
		drawing: TILE_DRAWINGS.scaleLinear,
	},
	{
		value: DashboardtypesAxisScaleDTO.log,
		label: 'Logarithmic',
		drawing: TILE_DRAWINGS.scaleLog,
	},
	{
		value: DashboardtypesAxisScaleDTO.symlog,
		label: 'Symlog',
		drawing: TILE_DRAWINGS.scaleSymlog,
	},
];

export const SCALE_HELP: Record<DashboardtypesAxisScaleDTO, string> = {
	[DashboardtypesAxisScaleDTO.auto]:
		'Logarithmic when every value is positive and they span three or more orders of magnitude, otherwise linear.',
	[DashboardtypesAxisScaleDTO.linear]: 'Evenly spaced values.',
	[DashboardtypesAxisScaleDTO.log]:
		"Spreads out values that span orders of magnitude. Groups with a value of 0 or less can't be placed and are left out.",
	[DashboardtypesAxisScaleDTO.symlog]:
		'Logarithmic, but places zero and negative values too.',
};
