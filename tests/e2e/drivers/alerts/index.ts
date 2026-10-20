import { kit } from '../kit';

import { withAlerts } from './driver';
import {
	withAlertChannel,
	withAlertHistory,
	withAlertList,
	withEmptyHistory,
	withMetricsHistory,
	withNoDataHistory,
	withOwnedRules,
	withResolvedHistory,
	withTracesHistory,
} from './seeds';

/**
 * The alerts `test`: the driver plus every alerts seed.
 *
 * Carrying all the seeds costs nothing a spec does not use — Playwright builds
 * fixtures lazily, so a spec that never destructures `resolvedHistory` never
 * pays its 105 s ruler wait. One import per spec is the point.
 */
export const test = withAlerts(
	withOwnedRules(
		withAlertChannel(
			withAlertList(
				withAlertHistory(
					withMetricsHistory(
						withTracesHistory(
							withResolvedHistory(withNoDataHistory(withEmptyHistory(kit))),
						),
					),
				),
			),
		),
	),
);

export { expect } from '../kit';
export { alertsDriver, HISTORY_ENDPOINTS, withAlerts } from './driver';
export type { Alerts, HistoryEndpoint } from './driver';
export * from './constants';
export type { TimelineItem, TimelineResponse } from './types';
export { V1_RULE_TEAM_LABEL } from './seeds';
