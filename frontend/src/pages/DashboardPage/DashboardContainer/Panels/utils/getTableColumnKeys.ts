import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType } from 'api/generated/services/sigNoz.schemas';

import { toQueryEnvelopes } from '../../queryV5/buildQueryRangeRequest';
import {
	type AggregationView,
	getAggregationColumnKey,
} from '../../queryV5/prepareScalarTables';

// Narrow view over any envelope spec: every variant carries name/disabled,
// only builder queries have aggregations.
interface QuerySpecView {
	name?: string;
	disabled?: boolean;
	aggregations?: AggregationView[];
}

/**
 * Keys every enabled query's value columns render under (one per aggregation on
 * multi-aggregation queries), derived from the panel's queries alone — lets a kind
 * switch key per-column config before any data exists. clickhouse_sql queries are
 * skipped: their columns are keyed by the response's SQL alias, unknowable here.
 */
export function getTableColumnKeys(
	queries: DashboardtypesQueryDTO[],
): string[] {
	const keys = new Set<string>();
	toQueryEnvelopes(queries).forEach((envelope) => {
		if (
			envelope.type ===
			Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql
		) {
			return;
		}
		const spec = envelope.spec as QuerySpecView | undefined;
		if (!spec?.name || spec.disabled) {
			return;
		}
		const { aggregations } = spec;
		const columnCount = Math.max(aggregations?.length ?? 0, 1);
		for (let index = 0; index < columnCount; index += 1) {
			keys.add(getAggregationColumnKey(spec.name, aggregations, index));
		}
	});
	return [...keys];
}
