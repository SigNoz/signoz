import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ThresholdColor } from 'pages/DashboardPage/DashboardContainer/Panels/types/threshold';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';

// Compact symbol shown on the operator tiles and in the collapsed summary row.
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

export const OPERATOR_PHRASE: Record<
	DashboardtypesComparisonOperatorDTO,
	string
> = {
	[DashboardtypesComparisonOperatorDTO.above]: 'above',
	[DashboardtypesComparisonOperatorDTO.above_or_equal]: 'above or equal to',
	[DashboardtypesComparisonOperatorDTO.below]: 'below',
	[DashboardtypesComparisonOperatorDTO.below_or_equal]: 'below or equal to',
	[DashboardtypesComparisonOperatorDTO.equal]: 'equal to',
	[DashboardtypesComparisonOperatorDTO.not_equal]: 'not equal to',
};

export const OPERATOR_TILES: ConfigTileItem<DashboardtypesComparisonOperatorDTO>[] =
	Object.values(DashboardtypesComparisonOperatorDTO).map((operator) => ({
		value: operator,
		label: OPERATOR_SYMBOL[operator],
		ariaLabel: OPERATOR_PHRASE[operator],
	}));

export const FORMAT_LABEL: Record<DashboardtypesThresholdFormatDTO, string> = {
	[DashboardtypesThresholdFormatDTO.background]: 'Background',
	[DashboardtypesThresholdFormatDTO.text]: 'Text',
};

export const COLOR_PRESETS: { label: string; value: ThresholdColor }[] = [
	{ label: 'Red', value: ThresholdColor.RED },
	{ label: 'Orange', value: ThresholdColor.ORANGE },
	{ label: 'Green', value: ThresholdColor.GREEN },
	{ label: 'Blue', value: ThresholdColor.BLUE },
];

function colorPresetName(hex: string | undefined): string {
	return (
		COLOR_PRESETS.find((p) => p.value.toLowerCase() === hex?.toLowerCase())
			?.label ?? 'Custom'
	);
}

export function describeThresholdPaint(
	color: string,
	format: DashboardtypesThresholdFormatDTO | undefined,
): string {
	const name = colorPresetName(color);
	return format ? `${name} ${FORMAT_LABEL[format].toLowerCase()}` : name;
}
