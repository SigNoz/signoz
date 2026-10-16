import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
	type DashboardtypesScatterPlotThresholdDTO,
	DashboardtypesThresholdAxisDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	type ScatterAxisOptions,
	ScatterAxisScale,
} from 'lib/visualization/charts/Scatter/utils';

import { mapThresholds } from '../../../utils/baseConfigBuilder';

const CHART_SCALE: Record<DashboardtypesAxisScaleDTO, ScatterAxisScale> = {
	[DashboardtypesAxisScaleDTO.auto]: ScatterAxisScale.Auto,
	[DashboardtypesAxisScaleDTO.linear]: ScatterAxisScale.Linear,
	[DashboardtypesAxisScaleDTO.log]: ScatterAxisScale.Log,
	[DashboardtypesAxisScaleDTO.symlog]: ScatterAxisScale.SymLog,
};

export function toScatterAxisOptions(
	axis: DashboardtypesScatterPlotAxisDTO | undefined,
	unit: string | undefined,
	thresholds: DashboardtypesScatterPlotThresholdDTO[] = [],
): ScatterAxisOptions {
	return {
		label: axis?.label,
		unit,
		softMin: axis?.softMin,
		softMax: axis?.softMax,
		scale: axis?.scale ? CHART_SCALE[axis.scale] : ScatterAxisScale.Auto,
		thresholds: mapThresholds(thresholds),
	};
}

/** A threshold without an axis marks y. */
export function getAxisThresholds(
	thresholds: DashboardtypesScatterPlotThresholdDTO[] | null | undefined,
	axis: DashboardtypesThresholdAxisDTO,
): DashboardtypesScatterPlotThresholdDTO[] {
	return (thresholds ?? []).filter(
		(threshold) => (threshold.axis ?? DashboardtypesThresholdAxisDTO.y) === axis,
	);
}
