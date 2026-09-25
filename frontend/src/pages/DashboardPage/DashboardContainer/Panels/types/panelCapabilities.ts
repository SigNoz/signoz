import {
	Querybuildertypesv5RequestTypeDTO,
	type TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { QueryMode } from 'types/common/dashboard';

export type { QueryBuilderFieldsConfig } from 'components/QueryBuilderV2/queryBuilderFields.types';

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
}

/** Raw rows rather than an aggregated result — the single source for "is this raw?". */
export function isRawRequest(capabilities: PanelQueryCapabilities): boolean {
	return capabilities.requestType === Querybuildertypesv5RequestTypeDTO.raw;
}

export type QueryModeCapability =
	| { kind: 'signal'; signals: TelemetrytypesSignalDTO[] }
	| { kind: 'signal-less' };

export type SupportedQueryModes = Partial<
	Record<QueryMode, QueryModeCapability>
>;

/** Signals `mode` accepts; empty for a signal-less or undeclared mode. */
export function getQueryModeSignals(
	modes: SupportedQueryModes | undefined,
	mode: QueryMode,
): TelemetrytypesSignalDTO[] {
	const capability = modes?.[mode];
	return capability?.kind === 'signal' ? capability.signals : [];
}
