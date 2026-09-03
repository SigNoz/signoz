import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { isQueryTypeSupportedByPanelKind } from '../DashboardContainer/Panels/capabilities';
import { getPanelDefinition } from '../DashboardContainer/Panels/registry';
import { PANEL_KIND_TO_PANEL_TYPE } from '../DashboardContainer/Panels/types/panelKind';
import type { PanelKind } from '../DashboardContainer/Panels/types/panelKind';
import { SectionKind } from '../DashboardContainer/Panels/types/sections';
import { buildDefaultQueries } from '../DashboardContainer/Panels/utils/buildDefaultQueries';
import {
	buildPluginSpec,
	type SeededPluginSpec,
} from '../DashboardContainer/Panels/utils/buildPluginSpec';
import { toPerses } from '../DashboardContainer/queryV5/persesQueryAdapters';

interface NewPanelSeed {
	/** May differ from the requested kind — see `resolveSeededPanelKind`. */
	kind: PanelKind;
	queries: DashboardtypesQueryDTO[];
	pluginSpec: SeededPluginSpec;
}

function kindSupportsUnit(kind: PanelKind): boolean {
	return getPanelDefinition(kind).sections.some(
		(section) =>
			section.kind === SectionKind.Formatting &&
			'controls' in section &&
			section.controls.unit === true,
	);
}

/** Kind to fall back to for a query language a builder-only kind (List) can't hold. */
const FALLBACK_KIND_BY_QUERY_TYPE: Partial<Record<EQueryType, PanelKind>> = {
	[EQueryType.PROM]: 'signoz/TimeSeriesPanel',
	[EQueryType.CLICKHOUSE]: 'signoz/TablePanel',
};

/** Keep the requested kind if it can hold the query; otherwise coerce so it isn't dropped. */
function resolveSeededPanelKind(
	requestedKind: PanelKind,
	compositeQuery: Query,
): PanelKind {
	if (isQueryTypeSupportedByPanelKind(requestedKind, compositeQuery.queryType)) {
		return requestedKind;
	}
	return (
		FALLBACK_KIND_BY_QUERY_TYPE[compositeQuery.queryType] ?? 'signoz/TablePanel'
	);
}

/**
 * A blank "Add panel" gets the requested kind's default seed; an explorer "Add to
 * Dashboard" export instead seeds from `compositeQuery` (converted to perses queries,
 * carrying the query's `unit`).
 */
export function buildNewPanelSeed(
	requestedKind: PanelKind,
	compositeQuery: Query | null,
	isExplorerExport = false,
): NewPanelSeed {
	if (!isExplorerExport || !compositeQuery) {
		return {
			kind: requestedKind,
			queries: buildDefaultQueries(requestedKind),
			pluginSpec: buildPluginSpec(getPanelDefinition(requestedKind).sections),
		};
	}

	const kind = resolveSeededPanelKind(requestedKind, compositeQuery);
	const pluginSpec = buildPluginSpec(getPanelDefinition(kind).sections);

	const converted = toPerses(compositeQuery, PANEL_KIND_TO_PANEL_TYPE[kind]);
	const queries = converted.length > 0 ? converted : buildDefaultQueries(kind);

	// Explorers put the single `unit` on the query itself, not the panel spec.
	if (compositeQuery.unit && kindSupportsUnit(kind)) {
		return {
			kind,
			queries,
			pluginSpec: {
				...pluginSpec,
				formatting: { ...pluginSpec.formatting, unit: compositeQuery.unit },
			},
		};
	}

	return { kind, queries, pluginSpec };
}
