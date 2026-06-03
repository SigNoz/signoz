import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import type { BuilderQuery } from 'types/api/v5/queryRange';

/**
 * Flattens a panel's queries into the list of builder queries it contains —
 * unwrapping `CompositeQuery` envelopes along the way. Non-builder kinds
 * (PromQL, ClickHouseSQL, Formula, TraceOperator) are dropped: they don't
 * carry the legend / groupBy / aggregation context downstream code needs.
 *
 * Returns the generated v5 `BuilderQuery` shape directly — no intermediate
 * summary type — so callers consume the same type the wire format defines.
 */
export function getBuilderQueries(
	queries: DashboardtypesQueryDTO[] | undefined,
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
