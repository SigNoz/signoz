import {
	DashboardtypesFillModeDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';
import { TILE_DRAWINGS } from '../../controls/drawings/tileDrawings';

export const LINE_STYLE_OPTIONS: ConfigTileItem<DashboardtypesLineStyleDTO>[] =
	[
		{
			value: DashboardtypesLineStyleDTO.solid,
			label: 'Solid',
			drawing: TILE_DRAWINGS.lineSolid,
		},
		{
			value: DashboardtypesLineStyleDTO.dashed,
			label: 'Dashed',
			drawing: TILE_DRAWINGS.lineDashed,
		},
	];

export const LINE_INTERPOLATION_OPTIONS: ConfigTileItem<DashboardtypesLineInterpolationDTO>[] =
	[
		{
			value: DashboardtypesLineInterpolationDTO.linear,
			label: 'Straight',
			drawing: TILE_DRAWINGS.interpLinear,
		},
		{
			value: DashboardtypesLineInterpolationDTO.spline,
			label: 'Smooth',
			drawing: TILE_DRAWINGS.interpSpline,
		},
		{
			value: DashboardtypesLineInterpolationDTO.step_before,
			label: 'Step before',
			drawing: TILE_DRAWINGS.interpStepBefore,
		},
		{
			value: DashboardtypesLineInterpolationDTO.step_after,
			label: 'Step after',
			drawing: TILE_DRAWINGS.interpStepAfter,
		},
	];

export const LINE_INTERPOLATION_HELP: Record<
	DashboardtypesLineInterpolationDTO,
	string
> = {
	[DashboardtypesLineInterpolationDTO.linear]:
		'Joins each point with a straight line.',
	[DashboardtypesLineInterpolationDTO.spline]:
		'Curves through each point. Can overshoot between points.',
	[DashboardtypesLineInterpolationDTO.step_before]:
		'Shows each value from the previous point up to its own timestamp.',
	[DashboardtypesLineInterpolationDTO.step_after]:
		'Holds each value until the next point.',
};

export const FILL_MODE_OPTIONS: ConfigTileItem<DashboardtypesFillModeDTO>[] = [
	{
		value: DashboardtypesFillModeDTO.none,
		label: 'None',
		drawing: TILE_DRAWINGS.fillNone,
	},
	{
		value: DashboardtypesFillModeDTO.solid,
		label: 'Solid',
		drawing: TILE_DRAWINGS.fillSolid,
	},
	{
		value: DashboardtypesFillModeDTO.gradient,
		label: 'Gradient',
		drawing: TILE_DRAWINGS.fillGradient,
	},
];

// An always-filled kind's wire enum (`AreaFillMode`) has no `none`.
export const FILLED_FILL_MODE_OPTIONS = FILL_MODE_OPTIONS.filter(
	(option) => option.value !== DashboardtypesFillModeDTO.none,
);

export enum DisconnectValuesMode {
	NEVER = 'never',
	THRESHOLD = 'threshold',
}

export const DISCONNECT_MODE_OPTIONS: ConfigTileItem<DisconnectValuesMode>[] = [
	{
		value: DisconnectValuesMode.NEVER,
		label: 'Connect the line',
		drawing: TILE_DRAWINGS.gapsConnect,
	},
	{
		value: DisconnectValuesMode.THRESHOLD,
		label: 'Break long gaps',
		drawing: TILE_DRAWINGS.gapsBreak,
	},
];
