import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';

/** A log axis cannot place a soft bound at or below zero, so it drops it. */
export function hasBoundALogAxisDrops(
	scale: DashboardtypesAxisScaleDTO,
	axis: DashboardtypesScatterPlotAxisDTO | undefined,
): boolean {
	return (
		scale === DashboardtypesAxisScaleDTO.log &&
		[axis?.softMin, axis?.softMax].some(
			(bound) => typeof bound === 'number' && bound <= 0,
		)
	);
}
