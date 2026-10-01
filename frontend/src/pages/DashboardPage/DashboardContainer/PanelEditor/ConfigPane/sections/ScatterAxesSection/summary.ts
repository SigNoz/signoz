import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxesDTO,
} from 'api/generated/services/sigNoz.schemas';

import { joinSummary } from '../../utils/summary';
import { SCALE_OPTIONS } from './options';

function scaleLabel(scale: DashboardtypesAxisScaleDTO | undefined): string {
	return (
		SCALE_OPTIONS.find(
			(option) => option.value === (scale ?? DashboardtypesAxisScaleDTO.auto),
		)?.label ?? ''
	);
}

export function summarizeScatterAxes(
	value: DashboardtypesScatterPlotAxesDTO | undefined,
): string {
	return joinSummary([
		`X ${scaleLabel(value?.x?.scale)}`,
		`Y ${scaleLabel(value?.y?.scale)}`,
	]);
}
