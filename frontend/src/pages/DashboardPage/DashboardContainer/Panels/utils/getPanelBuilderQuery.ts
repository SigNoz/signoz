import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getQueryPanelDefinition } from '../capabilities';
import { toLegacyPanelType } from '../types/panelKind';
import { fromPerses } from '../../queryV5/persesQueryAdapters';

/**
 * The panel's saved query as a builder `Query` — what the editor route and the View
 * modal put in `compositeQuery` when they open. Matches the seed
 * `usePanelEditorQuerySync` computes from the panel.
 *
 * `null` for a kind that renders from its own spec: there is no query to stage, and
 * callers skip the `compositeQuery` param entirely rather than asking about the kind.
 */
export function getPanelBuilderQuery(
	panel: DashboardtypesPanelDTO,
): Query | null {
	const kind = panel.spec.plugin.kind;
	const definition = getQueryPanelDefinition(kind);
	if (!definition) {
		return null;
	}
	const [defaultSignal] = definition.supportedSignals;
	// A query-less panel seeds from the kind's first supported signal — `fromPerses`'s
	// metrics default isn't authorable in every kind (e.g. List).
	if (panel.spec.queries.length === 0 && defaultSignal) {
		return initialQueriesMap[defaultSignal];
	}
	return fromPerses(panel.spec.queries, toLegacyPanelType(kind));
}
