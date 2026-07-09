import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';

import type {
	ComparisonThresholdShape,
	PanelThreshold,
	ThresholdComparisonOperator,
	ThresholdDisplayFormat,
} from '../types/threshold';

// Perses comparison operators → the symbol operators V2 threshold evaluation uses.
const OPERATOR_MAP: Record<
	DashboardtypesComparisonOperatorDTO,
	ThresholdComparisonOperator
> = {
	[DashboardtypesComparisonOperatorDTO.above]: '>',
	[DashboardtypesComparisonOperatorDTO.below]: '<',
	[DashboardtypesComparisonOperatorDTO.above_or_equal]: '>=',
	[DashboardtypesComparisonOperatorDTO.below_or_equal]: '<=',
	[DashboardtypesComparisonOperatorDTO.equal]: '=',
	[DashboardtypesComparisonOperatorDTO.not_equal]: '!=',
};

const FORMAT_MAP: Record<
	DashboardtypesThresholdFormatDTO,
	ThresholdDisplayFormat
> = {
	[DashboardtypesThresholdFormatDTO.text]: 'text',
	[DashboardtypesThresholdFormatDTO.background]: 'background',
};

/**
 * Maps a comparison-shaped spec threshold onto the V2-native `PanelThreshold`.
 * The single place the Perses operator/format enums cross into the symbol model,
 * shared by every kind that carries comparison thresholds (Number, Table, …).
 */
export function toPanelThreshold(
	threshold: ComparisonThresholdShape,
): PanelThreshold {
	return {
		color: threshold.color,
		operator: threshold.operator ? OPERATOR_MAP[threshold.operator] : undefined,
		value: threshold.value,
		unit: threshold.unit,
		format: threshold.format ? FORMAT_MAP[threshold.format] : undefined,
	};
}
