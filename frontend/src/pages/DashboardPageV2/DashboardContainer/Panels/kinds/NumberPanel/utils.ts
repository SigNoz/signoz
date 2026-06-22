import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesComparisonThresholdDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';

import type {
	PanelThreshold,
	ThresholdComparisonOperator,
	ThresholdDisplayFormat,
} from '../../types/threshold';

// Perses comparison operators → the symbol operators V2 threshold evaluation
// uses.
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
 * Maps the panel-spec threshold shape (`ComparisonThresholdDTO`) onto the
 * V2-native `PanelThreshold` consumed by `ValueDisplay` / threshold
 * evaluation. No dependency on the V1 `ThresholdProps` shape.
 */
export function mapNumberThresholds(
	thresholds: DashboardtypesComparisonThresholdDTO[] | null | undefined,
): PanelThreshold[] {
	if (!thresholds || thresholds.length === 0) {
		return [];
	}

	return thresholds.map((threshold) => ({
		color: threshold.color,
		operator: threshold.operator ? OPERATOR_MAP[threshold.operator] : undefined,
		value: threshold.value,
		unit: threshold.unit,
		format: threshold.format ? FORMAT_MAP[threshold.format] : undefined,
	}));
}
