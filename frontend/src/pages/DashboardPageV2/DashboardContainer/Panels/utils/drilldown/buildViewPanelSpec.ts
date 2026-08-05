import type {
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { getSwitchedPluginSpec } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/getSwitchedPluginSpec';
import {
	PANEL_TYPE_TO_PANEL_KIND,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { toPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getBuilderQueries } from '../getBuilderQueries';

/**
 * Bakes a V1 query + target panel type into a View-modal spec (drilldown seed + URL re-hydration).
 * When `panelType` maps to a different kind than the panel's (e.g. a breakout turns Value → Table),
 * the kind is switched via the editor's `getSwitchedPluginSpec` so it opens with populated config.
 */
export function buildViewPanelSpec({
	spec,
	query,
	panelType,
}: {
	spec: DashboardtypesPanelSpecDTO;
	query: Query;
	panelType: PANEL_TYPES;
}): DashboardtypesPanelSpecDTO {
	const queries = toPerses(query, panelType);
	const currentKind = spec.plugin.kind as PanelKind;
	const newKind = PANEL_TYPE_TO_PANEL_KIND[panelType] ?? currentKind;

	if (newKind === currentKind) {
		return { ...spec, queries };
	}

	// The plugin cast mirrors the editor's type-switch — a dynamically chosen kind can't be
	// correlated with its spec statically.
	const signal = getBuilderQueries(spec.queries)[0]
		?.signal as TelemetrytypesSignalDTO;
	return {
		...spec,
		plugin: {
			...spec.plugin,
			kind: newKind,
			spec: getSwitchedPluginSpec(spec, newKind, signal),
		} as DashboardtypesPanelPluginDTO,
		queries,
	};
}
