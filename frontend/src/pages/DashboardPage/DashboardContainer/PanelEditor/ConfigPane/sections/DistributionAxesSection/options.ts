import { DashboardtypesDistributionYScaleDTO } from 'api/generated/services/sigNoz.schemas';

import { pickScaleOptions } from '../AxesSection/options';

export const Y_SCALE_OPTIONS = pickScaleOptions([
	DashboardtypesDistributionYScaleDTO.linear,
	DashboardtypesDistributionYScaleDTO.log,
] as const);

export const Y_SCALE_HELP: Record<DashboardtypesDistributionYScaleDTO, string> =
	{
		linear: 'Bar heights proportional to counts.',
		log: 'Keeps small tail buckets visible next to the bulk.',
	};
