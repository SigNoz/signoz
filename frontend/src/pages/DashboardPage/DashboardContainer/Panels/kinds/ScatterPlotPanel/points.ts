import type { DashboardtypesScatterPlotPointsDTO } from 'api/generated/services/sigNoz.schemas';
import {
	DEFAULT_SCATTER_POINT_SIZE,
	type ScatterPointSize,
} from 'lib/uPlotV2/plugins/ScatterPlugin/types';

/** Bounds the spec validates point sizes (px) and opacity against. */
export const POINT_SIZE_BOUNDS = { min: 2, max: 40 } as const;
export const POINT_OPACITY_BOUNDS = { min: 0.1, max: 1 } as const;

export const DEFAULT_POINT_OPACITY = 0.7;

/** What an unset `points` draws as, spelled out for the editor's change tracking. */
export const DEFAULT_POINTS: Required<DashboardtypesScatterPlotPointsDTO> = {
	size: DEFAULT_SCATTER_POINT_SIZE.fixed,
	minSize: DEFAULT_SCATTER_POINT_SIZE.min,
	maxSize: DEFAULT_SCATTER_POINT_SIZE.max,
	opacity: DEFAULT_POINT_OPACITY,
};

export function resolvePointSize(
	points: DashboardtypesScatterPlotPointsDTO | undefined,
): ScatterPointSize {
	return {
		fixed: points?.size ?? DEFAULT_SCATTER_POINT_SIZE.fixed,
		min: points?.minSize ?? DEFAULT_SCATTER_POINT_SIZE.min,
		max: points?.maxSize ?? DEFAULT_SCATTER_POINT_SIZE.max,
	};
}

export function resolvePointOpacity(
	points: DashboardtypesScatterPlotPointsDTO | undefined,
): number {
	return points?.opacity ?? DEFAULT_POINT_OPACITY;
}
