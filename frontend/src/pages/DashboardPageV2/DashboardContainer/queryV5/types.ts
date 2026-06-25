import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';

// V5-native shapes the panel renderers consume, produced by the queryV5 prep utils from the raw
// query-range response.

/**
 * Raw V5 fetch result threaded from usePanelQuery to the renderers. Carries the request alongside
 * the response because column naming (scalar) and the X-scale clamps depend on what was sent.
 */
export interface PanelQueryData {
	response: QueryRangeV5200 | undefined;
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined;
	/** queryName → user legend, from the panel's queries. */
	legendMap: Record<string, string>;
}

/** One data point. `timestamp` is epoch milliseconds (V5 wire native). */
export interface PanelSeriesPoint {
	timestamp: number;
	value: number;
	/** True when the bucket at the range edge is incomplete. */
	partial?: boolean;
}

/**
 * Distinguishes the plain series list from the anomaly-detector companions
 * carried on the same aggregation bucket.
 */
export type PanelSeriesKind =
	| 'series'
	| 'predicted'
	| 'upperBound'
	| 'lowerBound'
	| 'anomalyScores';

/** One flattened time series (one aggregation bucket × one label set). */
export interface PanelSeries {
	queryName: string;
	/** Resolved legend: user-set legend, falling back to the query name when the series has no labels (V1 parity). */
	legend: string;
	/** Label name → value (empty when no group-by). Stringified — uPlot config and `getLabelName` need string values. */
	labels: Record<string, string>;
	values: PanelSeriesPoint[];
	kind: PanelSeriesKind;
	aggregation: {
		index: number;
		alias: string;
		unit?: string;
	};
}

export interface PanelTableColumn {
	/** Display name (alias/legend/expression resolution applied). */
	name: string;
	queryName: string;
	/** True for aggregation columns, false for group-by columns. */
	isValueColumn: boolean;
	/** Key into `PanelTableRow.data`. */
	id: string;
}

export interface PanelTableRow {
	data: Record<string, unknown>;
}

/** One scalar result rendered as a table (Number/Pie/Table panels). */
export interface PanelTable {
	queryName: string;
	legend: string;
	columns: PanelTableColumn[];
	rows: PanelTableRow[];
}

/**
 * Server-side, offset-based paging handles for raw/list panels (owned by `usePanelQuery`). Each
 * page re-fetches with a new `offset`. `canNext` is a heuristic — a full page or response
 * `nextCursor` implies more rows.
 */
export interface PanelPagination {
	/** Zero-based page index (`offset / pageSize`). */
	pageIndex: number;
	/** A previous page exists (`offset > 0`). */
	canPrev: boolean;
	/** Another page likely exists. */
	canNext: boolean;
	goPrev: () => void;
	goNext: () => void;
	/** Current page size (rows per page). */
	pageSize: number;
	/** Selectable page sizes for the size picker. */
	pageSizeOptions: number[];
	/** Change the page size; restarts paging from the first page. */
	setPageSize: (size: number) => void;
}
