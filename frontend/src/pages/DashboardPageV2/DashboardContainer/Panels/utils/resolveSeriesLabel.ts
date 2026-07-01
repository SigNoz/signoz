import type { BuilderQuery } from 'types/api/v5/queryRange';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

/**
 * Identity of one series for label resolution: which query produced it and
 * which of that query's aggregations.
 */
interface SeriesIdentity {
	queryName: string;
	/** Index into the matched query's aggregation list. */
	aggregationIndex: number;
	/** Fallback when the base label is empty and the aggregation is bare. */
	fallbackName?: string;
}

/** Resolves the display label for one flattened V5 series. */
export function resolveSeriesLabelV5(
	series: PanelSeries,
	builderQueries: BuilderQuery[],
	baseLabel: string,
): string {
	return resolveLabel(
		{
			queryName: series.queryName,
			aggregationIndex: series.aggregation.index,
			fallbackName: series.queryName,
		},
		builderQueries,
		baseLabel,
	);
}

/**
 * Applies the V1 legend matrix: single-vs-many builder queries × with/without
 * groupBy × single-vs-many aggregations. Returns `baseLabel` unchanged for
 * non-builder panels and for series whose aggregation has no alias/expression
 * (e.g. metric aggregations, which lack those fields).
 */
function resolveLabel(
	identity: SeriesIdentity,
	builderQueries: BuilderQuery[],
	baseLabel: string,
): string {
	if (builderQueries.length === 0) {
		return baseLabel;
	}

	const matching = builderQueries.find((q) => q.name === identity.queryName);
	if (!matching) {
		return baseLabel;
	}

	const aggIndex = identity.aggregationIndex;
	const aggregations = matching.aggregations ?? [];
	const aggregation = aggregations[aggIndex];

	// `alias`/`expression` exist on Log/Trace aggregations only (not
	// `MetricAggregation`); the `in` guards narrow the union without a cast.
	const aggregationAlias =
		aggregation && 'alias' in aggregation ? (aggregation.alias ?? '') : '';
	const aggregationExpression =
		aggregation && 'expression' in aggregation
			? (aggregation.expression ?? '')
			: '';

	if (!aggregationAlias && !aggregationExpression) {
		return baseLabel || identity.fallbackName || matching.name || '';
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

/** Panel has one builder query — ports V1's `getLegendForSingleAggregation`. */
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

/**
 * Multiple builder queries — ports V1's `getLegendForMultipleAggregations`.
 * Differs from the single-query path in the no-groupBy cells: single-agg falls
 * through to `baseLabel` (not `legend`), and multi-agg prepends the base label.
 */
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
