import type { DashboardtypesComparisonThresholdDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelThreshold } from '../../types/threshold';
import { toPanelThreshold } from '../../utils/mapComparisonThreshold';

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

	return thresholds.map(toPanelThreshold);
}
