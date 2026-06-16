import { REQUEST_TYPES } from 'api/v5/queryRange/constants';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { RequestType } from 'types/api/v5/queryRange';

/**
 * Maps an apply_filter `query.requestType` to the explorer panel type so the
 * Explorer opens in the view the query implies:
 *
 *   - `scalar`       -> Table        (grouped aggregation, e.g. "count by service")
 *   - `distribution` -> Table        (aggregation; Logs/Traces have no histogram view)
 *   - `time_series`  -> Time Series  (graph)
 *   - `raw` / other  -> List         (raw rows) [default]
 *
 * `trace` and the empty request type fall through to the List default on
 * purpose — they are raw, ungrouped result sets.
 *
 * The agent emits `requestType` on the request envelope of `action.query`. It
 * must be read off the raw action query *before* `toUrlCompositeQuery` maps the
 * inner `compositeQuery` (that mapper keeps only the builder queries and drops
 * the envelope). Without an explicit `panelTypes` URL param the Explorer falls
 * back to `PANEL_TYPES.LIST` (see `useGetPanelTypesQueryParam`), so a grouped
 * "count by service" query renders as a raw log list instead of a table.
 */
const REQUEST_TYPE_TO_PANEL_TYPE: Partial<Record<RequestType, PANEL_TYPES>> = {
	[REQUEST_TYPES.SCALAR]: PANEL_TYPES.TABLE,
	[REQUEST_TYPES.DISTRIBUTION]: PANEL_TYPES.TABLE,
	[REQUEST_TYPES.TIME_SERIES]: PANEL_TYPES.TIME_SERIES,
	[REQUEST_TYPES.RAW]: PANEL_TYPES.LIST,
};

export function getPanelTypeForRequestType(requestType: unknown): PANEL_TYPES {
	if (typeof requestType === 'string') {
		const mapped = REQUEST_TYPE_TO_PANEL_TYPE[requestType as RequestType];
		if (mapped) {
			return mapped;
		}
	}
	return PANEL_TYPES.LIST;
}

/** Reads the `requestType` envelope field off a raw apply_filter query payload. */
export function requestTypeFromActionQuery(
	query: Record<string, unknown> | null | undefined,
): unknown {
	return query?.requestType;
}
