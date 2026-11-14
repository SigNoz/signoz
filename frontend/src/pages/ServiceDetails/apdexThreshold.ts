import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import type { SystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';

/** The Apdex threshold T the `services-overview` definition is authored at, in ms. */
export const DEFAULT_APDEX_THRESHOLD_MS = 500;

const MS_PER_SECOND = 1000;

interface ThresholdAggregation {
	comparisonSpaceAggregationParam?: { threshold: number };
}

interface QuerySpecWithAggregations {
	aggregations?: ThresholdAggregation[];
}

function rescale(spec: QuerySpecWithAggregations, factor: number): unknown {
	if (!spec.aggregations?.some((a) => a.comparisonSpaceAggregationParam)) {
		return spec;
	}
	return {
		...spec,
		aggregations: spec.aggregations.map((aggregation) =>
			aggregation.comparisonSpaceAggregationParam
				? {
						...aggregation,
						comparisonSpaceAggregationParam: {
							...aggregation.comparisonSpaceAggregationParam,
							threshold:
								aggregation.comparisonSpaceAggregationParam.threshold * factor,
						},
					}
				: aggregation,
		),
	};
}

/**
 * Moves every histogram threshold count (Apdex's T and 4T) from the default T
 * to the service's saved one. Dashboard variables can't reach an aggregation's
 * threshold, so the page rewrites the definition it loads instead.
 */
export function withApdexThreshold(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	thresholdSeconds: number,
): DashboardtypesGettableDashboardV2DTO {
	const factor = (thresholdSeconds * MS_PER_SECOND) / DEFAULT_APDEX_THRESHOLD_MS;
	if (factor === 1) {
		return dashboard;
	}
	const panels = Object.fromEntries(
		Object.entries(dashboard.spec.panels).map(([id, panel]) => [
			id,
			panel && {
				...panel,
				spec: {
					...panel.spec,
					queries: panel.spec.queries.map((query) => {
						const plugin = query.spec.plugin as {
							kind: string;
							spec: { queries?: { type: string; spec: QuerySpecWithAggregations }[] };
						};
						if (plugin.kind !== 'signoz/CompositeQuery' || !plugin.spec.queries) {
							return query;
						}
						return {
							...query,
							spec: {
								...query.spec,
								plugin: {
									...plugin,
									spec: {
										...plugin.spec,
										queries: plugin.spec.queries.map((envelope) =>
											envelope.type === 'builder_query'
												? { ...envelope, spec: rescale(envelope.spec, factor) }
												: envelope,
										),
									},
								},
							},
						};
					}),
				},
			},
		]),
	) as DashboardtypesGettableDashboardV2DTO['spec']['panels'];
	return { ...dashboard, spec: { ...dashboard.spec, panels } };
}

/** The host with `select` rescaling Apdex to `thresholdSeconds`; create once per threshold. */
export function hostWithApdexThreshold(
	host: SystemDashboardHost,
	thresholdSeconds: number,
): SystemDashboardHost {
	const select: SystemDashboardHost['select'] = (response) =>
		withApdexThreshold(host.select(response), thresholdSeconds);
	return { ...host, select, source: { ...host.source, select } };
}
