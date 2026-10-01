import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	type ScatterAxisOptions,
	ScatterAxisScale,
} from 'lib/visualization/charts/Scatter/utils';

const CHART_SCALE: Record<DashboardtypesAxisScaleDTO, ScatterAxisScale> = {
	[DashboardtypesAxisScaleDTO.auto]: ScatterAxisScale.Auto,
	[DashboardtypesAxisScaleDTO.linear]: ScatterAxisScale.Linear,
	[DashboardtypesAxisScaleDTO.log]: ScatterAxisScale.Log,
	[DashboardtypesAxisScaleDTO.symlog]: ScatterAxisScale.SymLog,
};

export function toScatterAxisOptions(
	axis: DashboardtypesScatterPlotAxisDTO | undefined,
	unit: string | undefined,
): ScatterAxisOptions {
	return {
		label: axis?.label,
		unit,
		softMin: axis?.softMin,
		softMax: axis?.softMax,
		scale: axis?.scale ? CHART_SCALE[axis.scale] : ScatterAxisScale.Auto,
	};
}
