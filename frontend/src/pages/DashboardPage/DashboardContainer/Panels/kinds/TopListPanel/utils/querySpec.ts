import {
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5QueryEnvelopeFormulaDTOType,
	Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal,
	type Querybuildertypesv5BuilderQuerySpecDTO,
	type Querybuildertypesv5QueryBuilderFormulaDTO,
	type Querybuildertypesv5QueryBuilderTraceOperatorDTO,
	type Querybuildertypesv5QueryEnvelopeDTO,
	type Querybuildertypesv5QueryRangeRequestDTO,
} from 'api/generated/services/sigNoz.schemas';

export type SortDirection = 'asc' | 'desc';

export function findQueryEnvelope(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string | undefined,
): Querybuildertypesv5QueryEnvelopeDTO | undefined {
	return requestPayload?.compositeQuery?.queries?.find(
		(envelope) => envelope.spec?.name === queryName,
	);
}

type RankedSpec =
	| Querybuildertypesv5BuilderQuerySpecDTO
	| Querybuildertypesv5QueryBuilderFormulaDTO
	| Querybuildertypesv5QueryBuilderTraceOperatorDTO;

/** Builder queries, formulas and trace operators; PromQL and ClickHouse SQL have no spec to read. */
function findQuerySpec(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string | undefined,
): RankedSpec | undefined {
	const envelope = findQueryEnvelope(requestPayload, queryName);
	switch (envelope?.type) {
		case Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query:
		case Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query:
		case Querybuildertypesv5QueryEnvelopeFormulaDTOType.builder_formula:
		case Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType.builder_trace_operator:
			return envelope.spec;
		default:
			return undefined;
	}
}

const isMetricSpec = (
	spec: RankedSpec,
): spec is Extract<RankedSpec, { signal: MetricSignal }> =>
	'signal' in spec && spec.signal === MetricSignal.metrics;

const AGGREGATION_FUNCTION = /^\s*([a-z_]\w*)\s*\(/i;

/**
 * The ranked aggregation's function, lowercased: `p99` for `p99(duration_nano)`, the space
 * aggregation for a metric. Null for formulas and ClickHouse SQL, which have none to read.
 */
export function getRankedAggregationFunction(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string,
): string | null {
	const spec = findQuerySpec(requestPayload, queryName);
	if (!spec || !('aggregations' in spec)) {
		return null;
	}
	const name = isMetricSpec(spec)
		? spec.aggregations?.[0]?.spaceAggregation
		: spec.aggregations?.[0]?.expression?.match(AGGREGATION_FUNCTION)?.[1];
	return name ? name.toLowerCase() : null;
}

/** The ranked aggregation as the query writes it: its alias, expression or formula. */
export function describeValue(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string,
): string | null {
	const spec = findQuerySpec(requestPayload, queryName);
	if (!spec) {
		return null;
	}
	if (isMetricSpec(spec)) {
		const [aggregation] = spec.aggregations ?? [];
		if (!aggregation?.metricName) {
			return null;
		}
		return aggregation.spaceAggregation
			? `${aggregation.spaceAggregation}(${aggregation.metricName})`
			: aggregation.metricName;
	}
	if ('aggregations' in spec) {
		const [aggregation] = spec.aggregations ?? [];
		if (aggregation?.alias || aggregation?.expression) {
			return aggregation.alias || aggregation.expression || null;
		}
	}
	return ('expression' in spec && spec.expression) || null;
}

interface RankedOrder {
	direction: SortDirection;
	groupKey: string | null;
}

/**
 * How the ranked query orders its rows. The server orders by value, descending, when
 * no order is set; ordering by a group-by key returns the first N groups by that key.
 */
export function getRankedOrder(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string | undefined,
): RankedOrder {
	const spec = findQuerySpec(requestPayload, queryName);
	const [order] = spec?.order ?? [];
	const keyName = order?.key?.name;
	if (!keyName) {
		return { direction: 'desc', groupKey: null };
	}
	if (
		spec &&
		'groupBy' in spec &&
		spec.groupBy?.some((key) => key.name === keyName)
	) {
		return { direction: 'desc', groupKey: keyName };
	}
	return {
		direction: order.direction === 'asc' ? 'asc' : 'desc',
		groupKey: null,
	};
}

/** The request's queries and formulas, in builder order. */
export function getQueryOrder(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): string[] {
	return (requestPayload?.compositeQuery?.queries ?? [])
		.map((envelope) => envelope.spec?.name)
		.filter((name): name is string => Boolean(name));
}
