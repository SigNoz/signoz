import type { DashboardtypesDistributionPercentilesDTO } from 'api/generated/services/sigNoz.schemas';
import { DEFAULT_DISTRIBUTION_PERCENTILES } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/resolvers';

import type { ConfigMultiSelectItem } from '../../controls/ConfigMultiSelect/ConfigMultiSelect';

/** The save API rejects more. */
export const MAX_PERCENTILE_MARKERS = 5;

const PRESET_PERCENTILES = [50, 75, 90, 95, 99, 99.9];

/** The presets plus any saved value outside them, ascending, so nothing saved is hidden. */
export function resolvePercentileItems(
	values: number[],
): ConfigMultiSelectItem[] {
	return [...new Set([...PRESET_PERCENTILES, ...values])]
		.sort((a, b) => a - b)
		.map((percentile) => ({
			value: String(percentile),
			label: `p${percentile}`,
		}));
}

/** Unset reads as on, at p50/p90/p99. */
export function resolvePercentiles(
	percentiles: DashboardtypesDistributionPercentilesDTO | undefined,
): { enabled: boolean; values: number[] } {
	return {
		enabled: percentiles?.enabled ?? true,
		values: percentiles?.values ?? DEFAULT_DISTRIBUTION_PERCENTILES,
	};
}
