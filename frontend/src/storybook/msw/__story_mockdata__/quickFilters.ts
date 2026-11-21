/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { GetQuickFilters200 } from 'api/generated/services/sigNoz.schemas/getQuickFilters200';
import type { QuickfiltertypesSourceDTO } from 'api/generated/services/sigNoz.schemas/quickfiltertypesSourceDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesTelemetryFieldKeyDTO';

/** Typed builder for `/api/v2/quick_filters/{source}`. */
export const quickFiltersResponse = (
	source: QuickfiltertypesSourceDTO,
	filters: readonly TelemetrytypesTelemetryFieldKeyDTO[],
): GetQuickFilters200 => ({
	status: 'success',
	data: {
		id: `quick-filters-${source}`,
		orgId: 'org-signoz',
		source,
		filters: [...filters],
	},
});
