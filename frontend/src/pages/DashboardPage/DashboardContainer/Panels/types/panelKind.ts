import { PANEL_TYPES } from 'constants/queryBuilder';
import type { DashboardtypesPanelPluginKindDTO } from 'api/generated/services/sigNoz.schemas';

/**
 * String-literal union of every panel kind, derived from the generated enum.
 * A `${enum}` union (not the nominal enum) so plain string-literal kinds stay
 * assignable without enum-member ceremony at every call site.
 */
export type PanelKind = `${DashboardtypesPanelPluginKindDTO}`;

/**
 * Every kind's counterpart in `PANEL_TYPES`, the vocabulary the query builder,
 * explorers and alerts all speak. Total by construction: a new kind fails to compile
 * here until it declares which visualisation it is, and a kind whose visualisation
 * `PANEL_TYPES` doesn't name yet is a signal to add it there rather than to pick a
 * near-enough value.
 */
export const PANEL_KIND_TO_PANEL_TYPE: Record<PanelKind, PANEL_TYPES> = {
	'signoz/TimeSeriesPanel': PANEL_TYPES.TIME_SERIES,
	'signoz/BarChartPanel': PANEL_TYPES.BAR,
	'signoz/NumberPanel': PANEL_TYPES.VALUE,
	'signoz/PieChartPanel': PANEL_TYPES.PIE,
	'signoz/TablePanel': PANEL_TYPES.TABLE,
	'signoz/HistogramPanel': PANEL_TYPES.HISTOGRAM,
	'signoz/ListPanel': PANEL_TYPES.LIST,
	'signoz/TextPanel': PANEL_TYPES.TEXT,
};

/**
 * The `PANEL_TYPES` a kind maps to, for the query, alert and drilldown surfaces that
 * speak that vocabulary. A total lookup — every kind has an answer, so there is
 * nothing to default and no call site can be handed a visualisation that isn't its
 * own.
 */
export function toLegacyPanelType(kind: PanelKind): PANEL_TYPES {
	return PANEL_KIND_TO_PANEL_TYPE[kind];
}

/**
 * Reverse of {@link PANEL_KIND_TO_PANEL_TYPE} — the mapping is a bijection, so every
 * panel kind round-trips. Partial in this direction because `PANEL_TYPES` also names
 * visualisations with no dashboard kind (trace, empty); a lookup on those is
 * `undefined`.
 */
export const PANEL_TYPE_TO_PANEL_KIND: Partial<Record<PANEL_TYPES, PanelKind>> =
	Object.fromEntries(
		(Object.entries(PANEL_KIND_TO_PANEL_TYPE) as [PanelKind, PANEL_TYPES][]).map(
			([kind, type]) => [type, kind],
		),
	);
