import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type {
	MetricAggregation,
	SpaceAggregation,
} from 'types/api/v5/queryRange';

const PERCENTILE_SPACE_AGGREGATIONS = new Set<SpaceAggregation>([
	'p50',
	'p75',
	'p90',
	'p95',
	'p99',
]);

const HISTOGRAM_ATTRIBUTE_TYPES = new Set<string>([
	ATTRIBUTE_TYPES.HISTOGRAM,
	ATTRIBUTE_TYPES.EXPONENTIAL_HISTOGRAM,
]);

const DEFAULT_HISTOGRAM_SPACE_AGGREGATION = 'p90';

/** What a heatmap cell holds, and the one space aggregation the kind offers. */
const HEATMAP_HISTOGRAM_SPACE_AGGREGATION = 'count';

/**
 * A heatmap draws against one bucket axis, so the request takes exactly one enabled
 * query and refuses a formula over the cells. The per-kind cache restores whatever is
 * dropped here if the panel switches back.
 *
 * Percentiles go the same way: a histogram heatmap takes its axis from the `le` labels,
 * so a percentile draws the grid a count already draws, and the statement builder sums
 * the `le` counts either way.
 */
export function withSingleHeatmapQuery(query: Query): Query {
	const [first] = query.builder.queryData;
	if (!first) {
		return query;
	}

	return {
		...query,
		builder: {
			...query.builder,
			queryData: [
				{
					...first,
					spaceAggregation: withoutPercentile(first.spaceAggregation),
					aggregations: first.aggregations?.map((aggregation) => ({
						...aggregation,
						spaceAggregation: withoutPercentile(
							(aggregation as MetricAggregation).spaceAggregation,
						),
					})) as IBuilderQuery['aggregations'],
				},
			],
			queryFormulas: [],
		},
	};
}

/** Cast because the substitute is a `SpaceAggregation` whichever of its callers `T` came from. */
function withoutPercentile<T extends string | undefined>(
	spaceAggregation: T,
): T {
	return (
		PERCENTILE_SPACE_AGGREGATIONS.has(spaceAggregation as SpaceAggregation)
			? HEATMAP_HISTOGRAM_SPACE_AGGREGATION
			: spaceAggregation
	) as T;
}

/**
 * Undoes the count above: every other kind offers a histogram metric percentiles alone,
 * so a count carried out of a heatmap would sit in the selector with no option behind
 * it. Other metric types are left alone — count is a real choice for a sum or a gauge.
 */
export function withPercentileHistogramAggregation(query: Query): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((queryData) => {
				if (
					!HISTOGRAM_ATTRIBUTE_TYPES.has(queryData.aggregateAttribute?.type ?? '')
				) {
					return queryData;
				}

				return {
					...queryData,
					spaceAggregation: withoutCount(queryData.spaceAggregation),
					aggregations: queryData.aggregations?.map((aggregation) => ({
						...aggregation,
						spaceAggregation: withoutCount(
							(aggregation as MetricAggregation).spaceAggregation,
						),
					})) as IBuilderQuery['aggregations'],
				};
			}),
		},
	};
}

function withoutCount<T extends string | undefined>(spaceAggregation: T): T {
	return (
		spaceAggregation === HEATMAP_HISTOGRAM_SPACE_AGGREGATION
			? DEFAULT_HISTOGRAM_SPACE_AGGREGATION
			: spaceAggregation
	) as T;
}
