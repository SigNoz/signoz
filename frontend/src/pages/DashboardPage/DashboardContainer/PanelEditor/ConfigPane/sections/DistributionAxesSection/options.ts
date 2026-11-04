import {
	DashboardtypesDistributionXScaleDTO,
	DashboardtypesDistributionYScaleDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';
import { pickScaleOptions } from '../AxesSection/options';

export const X_SCALE_OPTIONS: ConfigTileItem<DashboardtypesDistributionXScaleDTO>[] =
	[
		{
			value: DashboardtypesDistributionXScaleDTO.auto,
			label: 'Auto',
			drawing: TILE_DRAWINGS.bucketColumnsAuto,
		},
		{
			value: DashboardtypesDistributionXScaleDTO.linear,
			label: 'Linear',
			drawing: TILE_DRAWINGS.bucketColumnsLinear,
		},
		{
			value: DashboardtypesDistributionXScaleDTO.log,
			label: 'Log',
			drawing: TILE_DRAWINGS.bucketColumnsLog,
		},
		{
			value: DashboardtypesDistributionXScaleDTO.symlog,
			label: 'Symlog',
			drawing: TILE_DRAWINGS.bucketColumnsSymlog,
		},
		{
			value: DashboardtypesDistributionXScaleDTO.ordinal,
			label: 'Equal',
			drawing: TILE_DRAWINGS.bucketColumnsOrdinal,
		},
	];

export const X_SCALE_HELP: Record<DashboardtypesDistributionXScaleDTO, string> =
	{
		auto:
			'Log for buckets spanning two or more orders of magnitude, otherwise linear.',
		linear: 'Bars as wide as their buckets.',
		log: 'More room for small buckets.',
		symlog: 'Log on both sides of zero, for buckets that cross it.',
		ordinal: 'Every bucket equally wide, whatever its range.',
	};

export const Y_SCALE_OPTIONS = pickScaleOptions([
	DashboardtypesDistributionYScaleDTO.linear,
	DashboardtypesDistributionYScaleDTO.log,
] as const);

export const Y_SCALE_HELP: Record<DashboardtypesDistributionYScaleDTO, string> =
	{
		linear: 'Bar heights proportional to counts.',
		log: 'Keeps small tail buckets visible next to the bulk.',
	};
