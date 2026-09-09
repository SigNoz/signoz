import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import { isAIBuilderEnvelope } from '../../queryV5/builderEnvelope';
import { toQueryEnvelopes } from '../../queryV5/buildQueryRangeRequest';

/**
 * Whether a saved panel holds an AI query. Read from the panel spec rather than the
 * query-builder provider, for the dashboard-grid actions that run outside the editor.
 */
export function panelHasAIQuery(panel: DashboardtypesPanelDTO): boolean {
	return toQueryEnvelopes(panel.spec.queries).some(isAIBuilderEnvelope);
}
