import type { DashboardtypesComparisonThresholdDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelThreshold } from '../../types/threshold';
import { toPanelThreshold } from '../../utils/mapComparisonThreshold';

/** Maps spec `ComparisonThresholdDTO`s onto the V2-native `PanelThreshold` (no V1 `ThresholdProps` dependency). */
export function mapNumberThresholds(
	thresholds: DashboardtypesComparisonThresholdDTO[] | null | undefined,
): PanelThreshold[] {
	if (!thresholds || thresholds.length === 0) {
		return [];
	}

	return thresholds.map(toPanelThreshold);
}
