import { DashboardtypesStackModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigSegmentedItem } from '../../controls/ConfigSegmented/ConfigSegmented';

// `percent` rescales each x-slice to its column total; the y axis follows.
export const STACK_MODE_OPTIONS: ConfigSegmentedItem[] = [
	{ value: DashboardtypesStackModeDTO.none, label: 'None' },
	{ value: DashboardtypesStackModeDTO.normal, label: 'Normal' },
	{ value: DashboardtypesStackModeDTO.percent, label: 'Percent' },
];
