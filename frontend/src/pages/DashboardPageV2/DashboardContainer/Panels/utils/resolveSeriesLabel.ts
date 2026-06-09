import type { BuilderQuery } from 'types/api/v5/queryRange';
import type { QueryData } from 'types/api/widgets/getQuery';

/**
 * Resolves the display label for one series, applying the V1 legend matrix:
 * `single-vs-many builder queries × with/without groupBy × single-vs-many
 * aggregations`. Returns `baseLabel` unchanged for panels without builder
 * queries (PromQL, ClickHouseSQL) and for builder series whose aggregation
 * carries no alias/expression — metric aggregations don't have those fields,
 * so they naturally short-circuit to the base label here.
 */
export function resolveSeriesLabel(
	series: QueryData,
	builderQueries: BuilderQuery[],
	baseLabel: string,
): string {
	if (builderQueries.length === 0) {
		return baseLabel;
	}

	const matching = builderQueries.find((q) => q.name === series.queryName);
	if (!matching) {
		return baseLabel;
	}

	// `series.metaData.index` points to the aggregation in the matched query
	// that produced this series. Default to 0 so single-aggregation panels
	// still resolve when the backend omits the field.
	const aggIndex = series.metaData?.index ?? 0;
	const aggregations = matching.aggregations ?? [];
	const aggregation = aggregations[aggIndex];

	// `alias` / `expression` exist on Log/Trace aggregations only —
	// `MetricAggregation` carries `metricName`/`temporality`/… instead. The
	// `in` guards narrow the union without a cast.
	const aggregationAlias =
		aggregation && 'alias' in aggregation ? (aggregation.alias ?? '') : '';
	const aggregationExpression =
		aggregation && 'expression' in aggregation
			? (aggregation.expression ?? '')
			: '';

	if (!aggregationAlias && !aggregationExpression) {
		return baseLabel || series.metaData?.queryName || matching.name || '';
	}

	const ctx: FormatContext = {
		aggregationAlias,
		aggregationExpression,
		baseLabel,
		legend: matching.legend ?? '',
		hasGroupBy: (matching.groupBy?.length ?? 0) > 0,
		singleAggregation: aggregations.length === 1,
	};

	return builderQueries.length === 1
		? formatForSinglePanelQuery(ctx)
		: formatForMultiplePanelQueries(ctx);
}

interface FormatContext {
	aggregationAlias: string;
	aggregationExpression: string;
	baseLabel: string;
	legend: string;
	hasGroupBy: boolean;
	singleAggregation: boolean;
}

// Panel has one builder query — ports V1's `getLegendForSingleAggregation`.
function formatForSinglePanelQuery({
	aggregationAlias,
	aggregationExpression,
	baseLabel,
	legend,
	hasGroupBy,
	singleAggregation,
}: FormatContext): string {
	if (hasGroupBy) {
		if (singleAggregation) {
			return baseLabel;
		}
		return `${aggregationAlias || aggregationExpression}-${baseLabel}`;
	}
	if (singleAggregation) {
		return aggregationAlias || legend || aggregationExpression;
	}
	return aggregationAlias || aggregationExpression;
}

// Panel has multiple builder queries — ports V1's `getLegendForMultipleAggregations`.
// Differs from the single-query path in two cells: the no-groupBy / single-agg
// cell falls through to `baseLabel` instead of `legend`, and the no-groupBy /
// multi-agg cell prepends the base label.
function formatForMultiplePanelQueries({
	aggregationAlias,
	aggregationExpression,
	baseLabel,
	hasGroupBy,
	singleAggregation,
}: FormatContext): string {
	if (hasGroupBy) {
		if (singleAggregation) {
			return baseLabel;
		}
		return `${aggregationAlias || aggregationExpression}-${baseLabel}`;
	}
	if (singleAggregation) {
		return aggregationAlias || baseLabel || aggregationExpression;
	}
	return `${aggregationAlias || aggregationExpression}-${baseLabel}`;
}
