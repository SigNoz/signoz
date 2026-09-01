import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getSupportedSignals } from '../capabilities';
import { PANEL_KIND_TO_PANEL_TYPE } from '../types/panelKind';
import { fromPerses } from '../../queryV5/persesQueryAdapters';

/**
 * The panel's saved query as a builder `Query` — what the editor route and the View
 * modal put in `compositeQuery` when they open. Matches the seed
 * `usePanelEditorQuerySync` computes from the panel.
 */
export function getPanelBuilderQuery(panel: DashboardtypesPanelDTO): Query {
	const kind = panel.spec.plugin.kind;
	const [defaultSignal] = getSupportedSignals(kind);
	// A query-less panel seeds from the kind's first supported signal — `fromPerses`'s
	// metrics default isn't authorable in every kind (e.g. List).
	if (panel.spec.queries.length === 0 && defaultSignal) {
		return initialQueriesMap[defaultSignal];
	}
	return fromPerses(panel.spec.queries, PANEL_KIND_TO_PANEL_TYPE[kind]);
}
