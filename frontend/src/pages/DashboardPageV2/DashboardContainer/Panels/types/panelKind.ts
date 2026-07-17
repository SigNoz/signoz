import { PANEL_TYPES } from 'constants/queryBuilder';
import type { DashboardtypesPanelPluginKindDTO } from 'api/generated/services/sigNoz.schemas';

/**
 * String-literal union of every panel kind, derived from the generated enum.
 * A `${enum}` union (not the nominal enum) so plain string-literal kinds stay
 * assignable without enum-member ceremony at every call site.
 */
export type PanelKind = `${DashboardtypesPanelPluginKindDTO}`;

export const PANEL_KIND_TO_PANEL_TYPE: Record<PanelKind, PANEL_TYPES> = {
	'signoz/TimeSeriesPanel': PANEL_TYPES.TIME_SERIES,
	'signoz/BarChartPanel': PANEL_TYPES.BAR,
	'signoz/NumberPanel': PANEL_TYPES.VALUE,
	'signoz/PieChartPanel': PANEL_TYPES.PIE,
	'signoz/TablePanel': PANEL_TYPES.TABLE,
	'signoz/HistogramPanel': PANEL_TYPES.HISTOGRAM,
	'signoz/ListPanel': PANEL_TYPES.LIST,
};

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
