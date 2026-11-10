import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { toQueryEnvelopes } from '../../queryV5/buildQueryRangeRequest';
import { deriveQueryType } from '../../queryV5/persesQueryAdapters';

/**
 * The authoring mode (builder / ClickHouse / PromQL) of a panel's query. Returns
 * `undefined` when the panel has no query yet so callers can hide query-type chrome
 * (e.g. the editor preview's "Plotted with" tag) rather than defaulting to builder.
 */
export function getPanelQueryType(
	panel: DashboardtypesPanelDTO,
): EQueryType | undefined {
	const envelopes = toQueryEnvelopes(panel.spec.queries);
	if (envelopes.length === 0) {
		return undefined;
	}
	return deriveQueryType(envelopes);
}
