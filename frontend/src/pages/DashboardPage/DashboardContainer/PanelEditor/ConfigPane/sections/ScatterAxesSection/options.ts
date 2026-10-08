import { DashboardtypesAxisScaleDTO } from 'api/generated/services/sigNoz.schemas';

import {
	pickScaleOptions,
	SCALE_HELP as AXIS_SCALE_HELP,
} from '../AxesSection/options';

export const SCALE_OPTIONS = pickScaleOptions([
	DashboardtypesAxisScaleDTO.auto,
	DashboardtypesAxisScaleDTO.linear,
	DashboardtypesAxisScaleDTO.log,
	DashboardtypesAxisScaleDTO.symlog,
]);

export const LOG_RANGE_IGNORED_HELP =
	"A log axis can't reach 0 or below, so that bound is ignored. Use Symlog to include it.";

/** A log axis leaves out groups it can't place, rather than drawing them elsewhere. */
export const SCALE_HELP: Record<DashboardtypesAxisScaleDTO, string> = {
	...AXIS_SCALE_HELP,
	[DashboardtypesAxisScaleDTO.log]:
		"Spreads out values that span orders of magnitude. Groups with a value of 0 or less can't be placed and are left out.",
};
