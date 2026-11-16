import {
	type DashboardtypesQueryDTO,
	Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType,
	Querybuildertypesv5QueryEnvelopePromQLDTOType,
} from 'api/generated/services/sigNoz.schemas';

import { toQueryEnvelopes } from '../../queryV5/buildQueryRangeRequest';
import { getBuilderQueries } from './getBuilderQueries';
import { getTableColumnKeys } from './getTableColumnKeys';

export interface QueryColumnKeys {
	valueKeys: Set<string>;
	groupKeys: Set<string>;
}

/**
 * The value and group-by column keys the queries produce; null when a
 * ClickHouse SQL or PromQL query's columns are only known at run time.
 */
export function getQueryColumnKeys(
	queries: DashboardtypesQueryDTO[],
): QueryColumnKeys | null {
	const hasRuntimeColumns = toQueryEnvelopes(queries).some(
		(envelope) =>
			envelope.type ===
				Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql ||
			envelope.type === Querybuildertypesv5QueryEnvelopePromQLDTOType.promql,
	);
	if (hasRuntimeColumns) {
		return null;
	}
	return {
		valueKeys: new Set(getTableColumnKeys(queries)),
		groupKeys: new Set(
			getBuilderQueries(queries).flatMap((query) =>
				(query.groupBy ?? []).map((key) => key.name),
			),
		),
	};
}
