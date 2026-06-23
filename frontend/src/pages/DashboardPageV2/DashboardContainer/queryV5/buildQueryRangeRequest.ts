import type {
	DashboardtypesQueryDTO,
	Querybuildertypesv5CompositeQueryDTO,
	Querybuildertypesv5QueryEnvelopeDTO,
	Querybuildertypesv5QueryRangeRequestDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	Querybuildertypesv5QueryTypeDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

/**
 * Narrow view over the builder-query / promql / clickhouse spec variants of
 * the generated query-envelope union. The generated envelope types erase
 * `spec` to `unknown` (Orval limitation on the discriminated union), so the
 * fields shared by every spec variant are read through this view with a
 * localized cast at the envelope boundary.
 */
interface QuerySpecView {
	name?: string;
	legend?: string;
	signal?: string;
	stepInterval?: number | string;
	aggregations?: { metricName?: string }[];
}

/**
 * Maps a V2 panel type to the V5 `requestType` the backend expects.
 *
 * HISTOGRAM and BAR panels bin/derive from raw time-series data client-side,
 * so the backend request type for them is `time_series` — the same effective
 * mapping the V1 path produced via `getGraphType` + `mapPanelTypeToRequestType`.
 */
export function panelTypeToRequestType(
	panelType: PANEL_TYPES,
): Querybuildertypesv5RequestTypeDTO {
	switch (panelType) {
		case PANEL_TYPES.TIME_SERIES:
		case PANEL_TYPES.BAR:
		case PANEL_TYPES.HISTOGRAM:
			return Querybuildertypesv5RequestTypeDTO.time_series;
		case PANEL_TYPES.TABLE:
		case PANEL_TYPES.PIE:
		case PANEL_TYPES.VALUE:
			return Querybuildertypesv5RequestTypeDTO.scalar;
		case PANEL_TYPES.LIST:
			return Querybuildertypesv5RequestTypeDTO.raw;
		case PANEL_TYPES.TRACE:
			return Querybuildertypesv5RequestTypeDTO.trace;
		default:
			return Querybuildertypesv5RequestTypeDTO.time_series;
	}
}

/**
 * Unwraps the perses query envelope into the V5 `compositeQuery.queries`
 * list. A CompositeQuery plugin already carries the V5 envelope list and is
 * passed through verbatim; bare plugins are wrapped into a single envelope.
 *
 * Top-level Formula and TraceOperator are invalid — they reference builder
 * queries by name and can only travel inside a CompositeQuery. Defensive
 * read: warn and drop, don't crash dashboard load.
 */
export function toQueryEnvelopes(
	queries: DashboardtypesQueryDTO[],
): Querybuildertypesv5QueryEnvelopeDTO[] {
	// Backend invariant: panel.queries.length === 1. Only the first entry is
	// consumed — extras (a malformed payload) are ignored.
	const plugin = queries[0]?.spec?.plugin;
	if (!plugin?.spec) {
		return [];
	}

	switch (plugin.kind) {
		case 'signoz/CompositeQuery':
			return (plugin.spec as Querybuildertypesv5CompositeQueryDTO).queries ?? [];
		case 'signoz/BuilderQuery':
			return [
				{
					type: Querybuildertypesv5QueryTypeDTO.builder_query,
					spec: plugin.spec,
				},
			];
		case 'signoz/PromQLQuery':
			return [{ type: Querybuildertypesv5QueryTypeDTO.promql, spec: plugin.spec }];
		case 'signoz/ClickHouseSQL':
			return [
				{
					type: Querybuildertypesv5QueryTypeDTO.clickhouse_sql,
					spec: plugin.spec,
				},
			];
		case 'signoz/Formula':
		case 'signoz/TraceOperator':
			// eslint-disable-next-line no-console
			console.warn(
				`buildQueryRangeRequest: top-level ${plugin.kind} is invalid ` +
					'(formulas and trace operators must travel inside a ' +
					'CompositeQuery alongside the builder query they reference). ' +
					'Dropping.',
			);
			return [];
		default:
			return [];
	}
}

/**
 * Step interval (seconds) for BAR panels so the bar count stays readable
 * (~80 bars max). Duplicated from V1 `getBarStepIntervalPoints`
 * (container/GridCardLayout/utils.ts) per the V1/V2 split policy.
 */
export function getBarStepIntervalSeconds(
	startMs: number,
	endMs: number,
): number {
	const durationMs = endMs - startMs;
	const durationMin = durationMs / (60 * 1000);

	if (durationMin <= 60) {
		return 60;
	}
	if (durationMin <= 180) {
		return 120;
	}
	if (durationMin <= 300) {
		return 180;
	}

	const totalPoints = Math.ceil(durationMs / (1000 * 60));
	const interval = Math.ceil(totalPoints / 80);
	const roundedInterval = Math.ceil(interval / 5) * 5;
	return roundedInterval * 60;
}

// BAR panels: builder queries without a user-set stepInterval get the
// range-derived interval so bars align (V1 parity: `updateBarStepInterval`).
function withBarStepInterval(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
	startMs: number,
	endMs: number,
): Querybuildertypesv5QueryEnvelopeDTO[] {
	const stepInterval = getBarStepIntervalSeconds(startMs, endMs);
	return envelopes.map((envelope) => {
		if (envelope.type !== Querybuildertypesv5QueryTypeDTO.builder_query) {
			return envelope;
		}
		const spec = envelope.spec as QuerySpecView;
		if (spec.stepInterval) {
			return envelope;
		}
		return { ...envelope, spec: { ...spec, stepInterval } };
	});
}

export interface BuildQueryRangeRequestArgs {
	queries: DashboardtypesQueryDTO[];
	panelType: PANEL_TYPES;
	/** Epoch milliseconds. */
	startMs: number;
	/** Epoch milliseconds. */
	endMs: number;
}

/**
 * Builds the generated V5 query-range request DTO directly from the panel's
 * perses queries — no V1 `Query` intermediary.
 *
 * Dashboard variables are intentionally absent (`variables: {}`) until V2
 * grows its own variable plumbing; this matches what usePanelQuery sent
 * through the V1 path.
 */
export function buildQueryRangeRequest({
	queries,
	panelType,
	startMs,
	endMs,
}: BuildQueryRangeRequestArgs): Querybuildertypesv5QueryRangeRequestDTO {
	let envelopes = toQueryEnvelopes(queries);
	if (panelType === PANEL_TYPES.BAR) {
		envelopes = withBarStepInterval(envelopes, startMs, endMs);
	}

	return {
		schemaVersion: 'v1',
		start: startMs,
		end: endMs,
		requestType: panelTypeToRequestType(panelType),
		compositeQuery: { queries: envelopes },
		formatOptions: {
			formatTableResultForUI: panelType === PANEL_TYPES.TABLE,
			fillGaps: false,
		},
		variables: {},
	};
}

/**
 * queryName → legend for every envelope that carries one. Replaces the
 * legendMap `prepareQueryRangePayloadV5` derived from the V1 query; consumed
 * by the legacy-response bridge for legend resolution.
 */
export function extractLegendMap(
	queries: DashboardtypesQueryDTO[],
): Record<string, string> {
	const legendMap: Record<string, string> = {};
	toQueryEnvelopes(queries).forEach((envelope) => {
		const spec = envelope.spec as QuerySpecView | undefined;
		if (spec?.name) {
			legendMap[spec.name] = spec.legend ?? '';
		}
	});
	return legendMap;
}

/**
 * Fetch gate. False when the panel has no queries, or when every metrics
 * builder query is missing a metric name (the V1 path short-circuited those
 * to an empty response via `validateMetricNameForMetricsDataSource` to avoid
 * a guaranteed 400; here the fetch is skipped outright).
 */
export function hasRunnableQueries(queries: DashboardtypesQueryDTO[]): boolean {
	const envelopes = toQueryEnvelopes(queries);
	if (envelopes.length === 0) {
		return false;
	}

	const metricsSpecs = envelopes
		.filter(
			(envelope) =>
				envelope.type === Querybuildertypesv5QueryTypeDTO.builder_query,
		)
		.map((envelope) => envelope.spec as QuerySpecView)
		.filter((spec) => spec.signal === 'metrics');

	if (metricsSpecs.length === 0) {
		return true;
	}

	return !metricsSpecs.every((spec) => {
		const metricName = spec.aggregations?.[0]?.metricName;
		return !metricName || metricName.trim() === '';
	});
}
