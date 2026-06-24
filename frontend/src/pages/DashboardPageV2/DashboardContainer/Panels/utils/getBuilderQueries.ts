import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import type { BuilderQuery } from 'types/api/v5/queryRange';

/**
 * Flattens a panel's queries into its builder queries, unwrapping
 * `CompositeQuery` envelopes. Non-builder kinds (PromQL, ClickHouseSQL, Formula,
 * TraceOperator) are dropped — they lack the legend/groupBy/aggregation context
 * downstream code needs. Returns the generated v5 `BuilderQuery` shape directly.
 */
export function getBuilderQueries(
	queries: DashboardtypesQueryDTO[] | null | undefined,
): BuilderQuery[] {
	if (!queries) {
		return [];
	}
	const flattened: BuilderQuery[] = [];
	queries.forEach((envelope) => {
		const plugin = envelope?.spec?.plugin;
		if (!plugin) {
			return;
		}
		if (plugin.kind === 'signoz/BuilderQuery') {
			flattened.push(plugin.spec as BuilderQuery);
			return;
		}
		if (plugin.kind === 'signoz/CompositeQuery') {
			(plugin.spec.queries ?? []).forEach((sub) => {
				if (sub.type === 'builder_query') {
					flattened.push(sub.spec as BuilderQuery);
				}
			});
		}
	});
	return flattened;
}
