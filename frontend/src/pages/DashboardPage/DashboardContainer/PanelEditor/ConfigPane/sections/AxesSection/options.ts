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

export const RANGE_HELP =
	'The axis always shows at least this range. Data outside it still stretches the axis.';

export const SCALE_HELP: Record<AxisScale, string> = {
	[AxisScale.LINEAR]: 'Evenly spaced values.',
	[AxisScale.LOG]: 'Spreads out values that span several orders of magnitude.',
};
