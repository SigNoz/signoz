import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';

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
