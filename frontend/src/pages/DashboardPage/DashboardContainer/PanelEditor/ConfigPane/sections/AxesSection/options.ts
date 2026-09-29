import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

export enum AxisScale {
	LINEAR = 'linear',
	LOG = 'log',
}

export const SCALE_OPTIONS: ConfigTileItem<AxisScale>[] = [
	{
		value: AxisScale.LINEAR,
		label: 'Linear',
		drawing: TILE_DRAWINGS.scaleLinear,
	},
	{
		value: AxisScale.LOG,
		label: 'Logarithmic',
		drawing: TILE_DRAWINGS.scaleLog,
	},
];
