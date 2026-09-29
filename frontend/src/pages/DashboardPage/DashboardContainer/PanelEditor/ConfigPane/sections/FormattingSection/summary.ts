import { DashboardtypesPrecisionOptionDTO } from 'api/generated/services/sigNoz.schemas';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';
import type {
	PanelFormattingSlice,
	SectionControlsOf,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import { joinSummary } from '../../utils/summary';
import { DEFAULT_DECIMAL_PRECISION } from './options';

function describeDecimals(precision: DashboardtypesPrecisionOptionDTO): string {
	if (precision === DashboardtypesPrecisionOptionDTO.full) {
		return 'full precision';
	}
	return precision === DashboardtypesPrecisionOptionDTO.NUMBER_1
		? '1 decimal'
		: `${precision} decimals`;
}

export function summarizeFormatting(
	value: PanelFormattingSlice | undefined,
	controls: SectionControlsOf<SectionKind.Formatting>,
): string {
	const hasColumnUnits = Object.keys(value?.columnUnits ?? {}).length > 0;
	return joinSummary([
		controls.unit &&
			(value?.unit ? getUniversalNameFromMetricUnit(value.unit) : 'No unit'),
		controls.columnUnits && hasColumnUnits && 'Per-column units',
		controls.decimals &&
			describeDecimals(value?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION),
	]);
}
