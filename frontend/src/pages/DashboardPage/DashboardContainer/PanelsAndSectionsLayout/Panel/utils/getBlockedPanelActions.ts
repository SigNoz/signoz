import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import { isAIBuilderEnvelope } from '../../../queryV5/builderEnvelope';
import { toQueryEnvelopes } from '../../../queryV5/buildQueryRangeRequest';
import type { PanelActionId } from '../PanelActionsMenu/panelActionMeta';

//TODO: @tewarig will enable these actions for AI Observability Panels
const AI_PANEL_REASON = 'Coming Soon For AI Observability Panels';

export type BlockedPanelActions = Partial<Record<PanelActionId, string>>;

/** Actions the panel's queries don't support yet, mapped to the disabled reason. */
export function getBlockedPanelActions(
	panel: DashboardtypesPanelDTO,
): BlockedPanelActions {
	// The editor and alert builder have no AI query mode. View in Logs/Traces stays on.
	if (toQueryEnvelopes(panel.spec.queries).some(isAIBuilderEnvelope)) {
		return {
			view: AI_PANEL_REASON,
			edit: AI_PANEL_REASON,
			createAlert: AI_PANEL_REASON,
		};
	}
	return {};
}
