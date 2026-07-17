import type {
	DashboardtypesQueryDTO,
	Querybuildertypesv5BuilderQuerySpecDTO,
	Querybuildertypesv5ClickHouseQueryDTO,
	Querybuildertypesv5CompositeQueryDTO,
	Querybuildertypesv5OrderByDTO,
	Querybuildertypesv5PromQueryDTO,
	Querybuildertypesv5QueryEnvelopeDTO,
	Querybuildertypesv5QueryRangeRequestDTO,
	Querybuildertypesv5QueryRangeRequestDTOVariables,
} from 'api/generated/services/sigNoz.schemas';
import {
	Querybuildertypesv5OrderDirectionDTO,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType,
	Querybuildertypesv5QueryEnvelopePromQLDTOType,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

// Narrow view over the envelope spec variants. Orval erases envelope `spec` to `unknown`, so
// shared fields are read through this view with a localized cast at the envelope boundary.
interface QuerySpecView {
	name?: string;
	legend?: string;
	signal?: string;
	stepInterval?: number | string;
	aggregations?: { metricName?: string }[];
	order?: Querybuildertypesv5OrderByDTO[];
}

/**
 * Maps a V2 panel type to the V5 `requestType`. HISTOGRAM/BAR bin client-side from raw
 * time-series, so their request type is `time_series` (V1 parity).
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
 * Unwraps the perses query into the V5 `compositeQuery.queries` list: a CompositeQuery passes
 * through verbatim, bare plugins wrap into one envelope. Top-level Formula/TraceOperator are
 * invalid (they reference builder queries by name) — warn and drop rather than crash load.
 */
export function toQueryEnvelopes(
	queries: DashboardtypesQueryDTO[],
): Querybuildertypesv5QueryEnvelopeDTO[] {
	// Backend invariant: panel.queries.length === 1. Only the first entry is consumed.
	if (queries.length === 0) {
		return [];
	}
	const plugin = queries[0].spec.plugin;
	if (!plugin?.spec) {
		return [];
	}

	switch (plugin.kind) {
		case 'signoz/CompositeQuery':
			return (plugin.spec as Querybuildertypesv5CompositeQueryDTO).queries ?? [];
		case 'signoz/BuilderQuery':
			// plugin.spec is the (un-narrowed) plugin-spec union, so pick the builder
			// spec out of it — mirroring the CompositeQuery case above.
			return [
				{
					type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
					spec: plugin.spec as Querybuildertypesv5BuilderQuerySpecDTO,
				},
			];
		case 'signoz/PromQLQuery':
			return [
				{
					type: Querybuildertypesv5QueryEnvelopePromQLDTOType.promql,
					spec: plugin.spec as Querybuildertypesv5PromQueryDTO,
				},
			];
		case 'signoz/ClickHouseSQL':
			return [
				{
					type: Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql,
					spec: plugin.spec as Querybuildertypesv5ClickHouseQueryDTO,
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
 * Step interval (seconds) for BAR panels capping the bar count (~80 max). Duplicated from V1
 * `getBarStepIntervalPoints` per the V1/V2 split policy.
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

/**
 * BAR panels: builder queries without a user-set stepInterval get the range-derived one so bars
 * align (V1 parity: `updateBarStepInterval`).
 */
function withBarStepInterval(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
	startMs: number,
	endMs: number,
): Querybuildertypesv5QueryEnvelopeDTO[] {
	const stepInterval = getBarStepIntervalSeconds(startMs, endMs);
	return envelopes.map((envelope) => {
		if (
			envelope.type !==
			Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query
		) {
			return envelope;
		}
		if (envelope.spec?.stepInterval) {
			return envelope;
		}
		return {
			...envelope,
			spec: {
				...envelope.spec,
				stepInterval,
			} as Querybuildertypesv5BuilderQuerySpecDTO,
		};
	});
}

/**
 * Enforces a total order on logs-list requests so offset paging can't duplicate/drop
 * same-millisecond rows: default the primary to `timestamp desc`, then always append `id`
 * (logs-explorer parity). Request-only; traces keep their order.
 */
function withListOrderTiebreaker(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
): Querybuildertypesv5QueryEnvelopeDTO[] {
	return envelopes.map((envelope) => {
		if (
			envelope.type !==
			Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query
		) {
			return envelope;
		}
		const spec = envelope.spec as QuerySpecView;
		const order = spec.order ?? [];
		if (spec.signal !== 'logs' || order.some((o) => o.key?.name === 'id')) {
			return envelope;
		}
		const primary =
			order.length > 0
				? order
				: [
						{
							key: { name: 'timestamp' },
							direction: Querybuildertypesv5OrderDirectionDTO.desc,
						},
					];
		return {
			...envelope,
			spec: {
				...envelope.spec,
				order: [
					...primary,
					{ key: { name: 'id' }, direction: primary[0].direction },
				],
			} as Querybuildertypesv5BuilderQuerySpecDTO,
		};
	});
}

/**
 * Stamps offset/limit onto builder-query envelopes (server-side paging for raw/list); other
 * kinds pass through.
 */
function withPagination(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
	{ offset, limit }: { offset: number; limit: number },
): Querybuildertypesv5QueryEnvelopeDTO[] {
	return envelopes.map((envelope) => {
		if (
			envelope.type !==
			Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query
		) {
			return envelope;
		}
		return {
			...envelope,
			spec: {
				...envelope.spec,
				offset,
				limit,
			} as Querybuildertypesv5BuilderQuerySpecDTO,
		};
	});
}

export interface BuildQueryRangeRequestArgs {
	queries: DashboardtypesQueryDTO[];
	panelType: PANEL_TYPES;
	/** Epoch milliseconds. */
	startMs: number;
	/** Epoch milliseconds. */
	endMs: number;
	/** Backend-fill missing points with 0 (panel's `visualization.fillSpans`) → `formatOptions.fillGaps`. */
	fillGaps?: boolean;
	/** Server-side paging for raw/list panels, written onto the builder queries' `offset`/`limit`. */
	pagination?: { offset: number; limit: number };
	/** Runtime variable values (name → {type,value}) substituted server-side; built by `buildVariablesPayload`. */
	variables?: Querybuildertypesv5QueryRangeRequestDTOVariables;
}

/**
 * Builds the V5 query-range request DTO directly from the panel's perses queries (no V1 `Query`
 * intermediary). `variables` carries the runtime selection (empty when the dashboard has none).
 */
export function buildQueryRangeRequest({
	queries,
	panelType,
	startMs,
	endMs,
	fillGaps = false,
	pagination,
	variables = {},
}: BuildQueryRangeRequestArgs): Querybuildertypesv5QueryRangeRequestDTO {
	let envelopes = toQueryEnvelopes(queries);
	if (panelType === PANEL_TYPES.BAR) {
		envelopes = withBarStepInterval(envelopes, startMs, endMs);
	}
	if (panelType === PANEL_TYPES.LIST) {
		envelopes = withListOrderTiebreaker(envelopes);
	}
	if (pagination) {
		envelopes = withPagination(envelopes, pagination);
	}

	return {
		schemaVersion: 'v1',
		start: startMs,
		end: endMs,
		requestType: panelTypeToRequestType(panelType),
		compositeQuery: { queries: envelopes },
		formatOptions: {
			formatTableResultForUI: panelType === PANEL_TYPES.TABLE,
			fillGaps,
		},
		variables,
	};
}

/** queryName → legend for every envelope that carries one, for legend resolution. */
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
 * Fetch gate. False with no queries, or when every metrics builder query lacks a metric name —
 * skipping a guaranteed 400 (V1 parity: `validateMetricNameForMetricsDataSource`).
 */
export function hasRunnableQueries(queries: DashboardtypesQueryDTO[]): boolean {
	const envelopes = toQueryEnvelopes(queries);
	if (envelopes.length === 0) {
		return false;
	}

	const metricsSpecs = envelopes
		.filter(
			(envelope) =>
				envelope.type ===
				Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
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
