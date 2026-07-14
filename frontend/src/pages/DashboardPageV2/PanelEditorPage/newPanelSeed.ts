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
	/** Effective kind to create — may differ from the requested one (see below). */
	kind: PanelKind;
	queries: DashboardtypesQueryDTO[];
	pluginSpec: SeededPluginSpec;
}

/** Whether a kind's Formatting section exposes a `unit` control (Table/List don't). */
function kindSupportsUnit(kind: PanelKind): boolean {
	return getPanelDefinition(kind).sections.some(
		(section) =>
			section.kind === SectionKind.Formatting &&
			'controls' in section &&
			section.controls.unit === true,
	);
}

/**
 * Effective kind for an export: the requested kind, or — when it can't hold the query's
 * language (only List, which is builder-only) — a compatible one so the query isn't
 * dropped: PromQL → TimeSeries, ClickHouse → Table.
 */
function resolveSeededPanelKind(
	requestedKind: PanelKind,
	compositeQuery: Query | null,
): PanelKind {
	if (
		!compositeQuery ||
		isQueryTypeSupportedByPanelKind(requestedKind, compositeQuery.queryType)
	) {
		return requestedKind;
	}
	return compositeQuery.queryType === EQueryType.PROM
		? 'signoz/TimeSeriesPanel'
		: 'signoz/TablePanel';
}

/**
 * Seed for a new panel from the explorer "Add to Dashboard" export: resolve the effective
 * kind, convert the exported `compositeQuery` to perses queries, and carry a unit-bearing
 * kind's explorer `unit`. Falls back to the kind's default seed when there's no query or
 * conversion yields nothing runnable.
 */
export function buildNewPanelSeed(
	requestedKind: PanelKind,
	compositeQuery: Query | null,
): NewPanelSeed {
	const kind = resolveSeededPanelKind(requestedKind, compositeQuery);
	const pluginSpec = buildPluginSpec(getPanelDefinition(kind).sections);

	if (!compositeQuery) {
		return { kind, queries: buildDefaultQueries(kind), pluginSpec };
	}

	const converted = toPerses(compositeQuery, PANEL_KIND_TO_PANEL_TYPE[kind]);
	const queries = converted.length > 0 ? converted : buildDefaultQueries(kind);

	// An exported Query has only a single `unit`, no per-column units to seed `columnUnits`.
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
