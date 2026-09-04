import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigSelectItem } from '../../controls/ConfigSelect/ConfigSelect';

// Per-panel time scope. "Global Time" follows the dashboard's time picker; the rest pin
// the panel to a fixed relative window regardless of the dashboard range (V1 parity).
export const TIME_PREFERENCE_OPTIONS: ConfigSelectItem<DashboardtypesTimePreferenceDTO>[] =
	[
		{ value: DashboardtypesTimePreferenceDTO.global_time, label: 'Global Time' },
		{ value: DashboardtypesTimePreferenceDTO.last_5_min, label: 'Last 5 min' },
		{ value: DashboardtypesTimePreferenceDTO.last_15_min, label: 'Last 15 min' },
		{ value: DashboardtypesTimePreferenceDTO.last_30_min, label: 'Last 30 min' },
		{ value: DashboardtypesTimePreferenceDTO.last_1_hr, label: 'Last 1 hr' },
		{ value: DashboardtypesTimePreferenceDTO.last_6_hr, label: 'Last 6 hr' },
		{ value: DashboardtypesTimePreferenceDTO.last_1_day, label: 'Last 1 day' },
		{ value: DashboardtypesTimePreferenceDTO.last_3_days, label: 'Last 3 days' },
		{ value: DashboardtypesTimePreferenceDTO.last_1_week, label: 'Last 1 week' },
		{
			value: DashboardtypesTimePreferenceDTO.last_1_month,
			label: 'Last 1 month',
		},
	];
