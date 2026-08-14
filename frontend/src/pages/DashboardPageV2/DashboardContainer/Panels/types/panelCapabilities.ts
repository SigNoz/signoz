import {
	Querybuildertypesv5RequestTypeDTO,
	type TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';

/**
 * Query-builder field-visibility config a panel kind can declare, mirroring the
 * shape `QueryBuilderV2` consumes via its `filterConfigs` prop. Derived from that
 * prop type (the underlying `FilterConfigs` isn't exported) so the two never drift.
 */
export type FilterConfigsPartial = NonNullable<
	QueryBuilderProps['filterConfigs']
>;

/**
 * Per-signal query-builder field rules for a panel kind. `default` applies to every
 * signal; a per-signal entry is merged over it (signal wins). The capabilities guard
 * resolves this into a single `FilterConfigsPartial` via `getHiddenQueryBuilderFields`.
 */
export type QueryBuilderFieldRule = {
	default?: FilterConfigsPartial;
} & Partial<Record<TelemetrytypesSignalDTO, FilterConfigsPartial>>;

/**
 * How a kind's query-range request is shaped. Declared per-kind in
 * `kinds/<Kind>/definition.ts` and read through the capabilities guard, so no V2 code
 * has to translate a panel kind into the legacy `PANEL_TYPES` enum to answer these.
 */
export interface PanelQueryCapabilities {
	/** V5 request type the panel's data comes back as. */
	requestType: Querybuildertypesv5RequestTypeDTO;
	/** Server transposes the scalar result into UI table rows (`formatOptions.formatTableResultForUI`). */
	formatTableResultForUI: boolean;
	/**
	 * Widen the step interval to cap how many buckets come back — kinds that bin
	 * client-side from a raw time series rather than plotting every point.
	 */
	bucketedStepInterval: boolean;
	/**
	 * Append a deterministic tiebreaker to the query's `order` so offset paging over raw
	 * rows can't repeat or skip a row when the sort key has duplicates.
	 */
	orderTiebreaker: boolean;
	/**
	 * Rows page server-side via `offset`/`limit`. AND-ed at the call site with "the query
	 * carries no explicit limit" — an explicit limit means the user asked for a fixed set.
	 */
	serverPaginated: boolean;
	/**
	 * Authored as a list view: the query builder drops its aggregation controls, and the
	 * editor preview hides the plot-mode chip because nothing is plotted.
	 */
	listView: boolean;
	/** Query builder offers a trace operator alongside the builder queries. */
	traceOperator: boolean;
}
