import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { listViewInitialLogQuery } from 'constants/queryBuilder';

import { toPerses } from '../../queryV5/persesQueryAdapters';
import type { PanelQueryCapabilities } from '../types/panelCapabilities';
import { PANEL_KIND_TO_PANEL_TYPE, type PanelKind } from '../types/panelKind';

/** Seed query for a new panel. Only a list view needs one (logs, timestamp desc) so its
 * preview runs on open; other kinds start empty and seed from the builder. */
export function buildDefaultQueries(
	kind: PanelKind,
	queryCapabilities: PanelQueryCapabilities,
): DashboardtypesQueryDTO[] {
	if (!queryCapabilities.listView) {
		return [];
	}
	// `toPerses` pivots through the V1 `Query`, which is still keyed by panel type.
	return toPerses(listViewInitialLogQuery, PANEL_KIND_TO_PANEL_TYPE[kind]);
}
