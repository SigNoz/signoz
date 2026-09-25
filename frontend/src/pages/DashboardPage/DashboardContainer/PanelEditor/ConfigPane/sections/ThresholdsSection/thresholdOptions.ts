import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { ConfigSelectItem } from '../../controls/ConfigSelect/ConfigSelect';

// Comparison operators offered in the "If value is" condition picker. Labels pair a
// word with its math symbol so the dropdown reads clearly while the view row can show
// the compact symbol (OPERATOR_SYMBOL below).
export const OPERATOR_OPTIONS: ConfigSelectItem[] = [
	{ value: DashboardtypesComparisonOperatorDTO.above, label: 'Above (>)' },
	{
		value: DashboardtypesComparisonOperatorDTO.above_or_equal,
		label: 'Above or equal (≥)',
	},
	{ value: DashboardtypesComparisonOperatorDTO.below, label: 'Below (<)' },
	{
		value: DashboardtypesComparisonOperatorDTO.below_or_equal,
		label: 'Below or equal (≤)',
	},
	{ value: DashboardtypesComparisonOperatorDTO.equal, label: 'Equal (=)' },
	{
		value: DashboardtypesComparisonOperatorDTO.not_equal,
		label: 'Not equal (≠)',
	},
];

// Compact symbol shown in the collapsed (view-mode) summary row.
export const OPERATOR_SYMBOL: Record<
	DashboardtypesComparisonOperatorDTO,
	string
> = {
	[DashboardtypesComparisonOperatorDTO.above]: '>',
	[DashboardtypesComparisonOperatorDTO.above_or_equal]: '≥',
	[DashboardtypesComparisonOperatorDTO.below]: '<',
	[DashboardtypesComparisonOperatorDTO.below_or_equal]: '≤',
	[DashboardtypesComparisonOperatorDTO.equal]: '=',
	[DashboardtypesComparisonOperatorDTO.not_equal]: '≠',
};

// How the threshold recolors the panel: just the number ("text") or the whole tile
// ("background").
export const FORMAT_OPTIONS: ConfigSelectItem[] = [
	{ value: DashboardtypesThresholdFormatDTO.background, label: 'Background' },
	{ value: DashboardtypesThresholdFormatDTO.text, label: 'Text' },
];
