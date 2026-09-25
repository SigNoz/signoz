import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import type { FilterData } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

// Drilldown is the click-to-context-menu feature ported from V1. Every renderer turns its native
// click into one `DrilldownClickPayload`; the kind-agnostic orchestration layer consumes only that.
// `FilterData` is imported read-only from the V1 util so the payload feeds `buildDrilldownUrl`
// directly, with no intermediate translation.

/** The clicked point's drilldown context, derived from the flattened series/columns the renderer holds. */
export interface DrilldownContext {
	/** The clicked series'/column's query. Drives query selection in `getViewQuery`. */
	queryName: string;
	/** Telemetry signal of the clicked query — picks the explorer the drilldown navigates to. */
	signal: TelemetrytypesSignalDTO;
	/** Key/value/op filters from the clicked point's group-by labels (empty when ungrouped). */
	filters: FilterData[];
	/** Explorer time window. Charts use the clicked bucket ±step; scalar panels use the fetched window. */
	timeRange?: { startTime: number; endTime: number };
	/** Series/slice display name, shown as the menu header's second line. */
	label?: string;
	/** Series/slice colour; tints the menu header label and item icons (charts/pie only). */
	seriesColor?: string;
	/** Tables only: a value column opens the aggregate menu; a group column opens filter-by-value. */
	columnKind?: 'aggregate' | 'group';
	/** Group-column click only: the clicked column's key, for the filter-by-value menu. */
	clickedKey?: string;
	/** Group-column click only: the clicked cell's value, for the filter-by-value menu. */
	clickedValue?: string | number;
}

/** What each renderer's `onClick` emits: where to anchor the popover plus the drilldown context. */
export interface DrilldownClickPayload {
	/** Absolute viewport coordinates for the popover anchor. */
	coordinates: { x: number; y: number };
	context: DrilldownContext;
}

/**
 * Opens the View modal on a refined drilldown query (filter-by-value / breakout). In the grid this
 * navigates to the modal seeded with the query; inside the modal it refines the view in place.
 */
export type OpenDrilldownView = (
	panelId: string,
	query: Query,
	panelType: PANEL_TYPES,
) => void;
