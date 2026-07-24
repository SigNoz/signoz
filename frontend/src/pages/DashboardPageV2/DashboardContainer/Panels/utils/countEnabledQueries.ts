import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { toQueryEnvelopes } from 'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest';

/** Counts enabled queries, unwrapping the single `signoz/CompositeQuery` wrapper. */
export function countEnabledQueries(queries: DashboardtypesQueryDTO[]): number {
	return toQueryEnvelopes(queries).filter((envelope) => !envelope.spec?.disabled)
		.length;
}
