import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { listViewInitialLogQuery, PANEL_TYPES } from 'constants/queryBuilder';

import { toPerses } from '../../queryV5/persesQueryAdapters';
import { PANEL_KIND_TO_PANEL_TYPE, type PanelKind } from '../types/panelKind';

/** Seed query for a new panel. Only List needs one (logs, timestamp desc) so its
 * preview runs on open; other kinds start empty and seed from the builder. */
export function buildDefaultQueries(kind: PanelKind): DashboardtypesQueryDTO[] {
	if (PANEL_KIND_TO_PANEL_TYPE[kind] === PANEL_TYPES.LIST) {
		return toPerses(listViewInitialLogQuery, PANEL_TYPES.LIST);
	}
	return [];
}
