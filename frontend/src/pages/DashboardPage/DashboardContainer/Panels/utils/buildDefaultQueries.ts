import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { listViewInitialLogQuery } from 'constants/queryBuilder';

import { toPerses } from '../../queryV5/persesQueryAdapters';
import { toLegacyPanelType, type PanelKind } from '../types/panelKind';

/** Seed query for a new panel. Only a list panel needs one (logs, timestamp desc) so its
 * preview runs on open; other kinds start empty and seed from the builder. */
export function buildDefaultQueries(kind: PanelKind): DashboardtypesQueryDTO[] {
	if (kind !== 'signoz/ListPanel') {
		return [];
	}
	// `toPerses` pivots through the V1 `Query`, which is still keyed by panel type.
	return toPerses(listViewInitialLogQuery, toLegacyPanelType(kind));
}
