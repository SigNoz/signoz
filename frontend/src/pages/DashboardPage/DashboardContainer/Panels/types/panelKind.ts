import { PANEL_TYPES } from 'constants/queryBuilder';
import type { DashboardtypesPanelPluginKindDTO } from 'api/generated/services/sigNoz.schemas';

/**
 * String-literal union of every panel kind, derived from the generated enum.
 * A `${enum}` union (not the nominal enum) so plain string-literal kinds stay
 * assignable without enum-member ceremony at every call site.
 */
export type PanelKind = `${DashboardtypesPanelPluginKindDTO}`;

/**
 * Partial: a static kind has no legacy `PANEL_TYPES` counterpart — V1 never had
 * one. V1-era query/alert/drilldown paths read {@link toLegacyPanelType}; new code
 * reads this map directly, where the `undefined` is worth seeing.
 */
export const PANEL_KIND_TO_PANEL_TYPE: Partial<Record<PanelKind, PANEL_TYPES>> = {
	'signoz/TimeSeriesPanel': PANEL_TYPES.TIME_SERIES,
	'signoz/BarChartPanel': PANEL_TYPES.BAR,
	'signoz/NumberPanel': PANEL_TYPES.VALUE,
	'signoz/PieChartPanel': PANEL_TYPES.PIE,
	'signoz/TablePanel': PANEL_TYPES.TABLE,
	'signoz/HistogramPanel': PANEL_TYPES.HISTOGRAM,
	'signoz/ListPanel': PANEL_TYPES.LIST,
};

/**
 * The legacy `PANEL_TYPES` a kind maps to, for the V1-era query, alert and
 * drilldown surfaces that still speak it. Every such path is gated on the kind's
 * query arm or an action capability a static kind declares `false`, so the
 * fallback is unreachable — it exists to keep those call sites total rather than
 * have each invent its own.
 */
export function toLegacyPanelType(kind: PanelKind): PANEL_TYPES {
	return PANEL_KIND_TO_PANEL_TYPE[kind] ?? PANEL_TYPES.TIME_SERIES;
}

/**
 * Reverse of {@link PANEL_KIND_TO_PANEL_TYPE} — the mapping is a bijection, so every
 * panel kind round-trips. Partial because `PANEL_TYPES` also has types with no V2 kind
 * (e.g. trace/empty); a lookup on those returns `undefined`.
 */
export const PANEL_TYPE_TO_PANEL_KIND: Partial<Record<PANEL_TYPES, PanelKind>> =
	Object.fromEntries(
		(Object.entries(PANEL_KIND_TO_PANEL_TYPE) as [PanelKind, PANEL_TYPES][]).map(
			([kind, type]) => [type, kind],
		),
	);
