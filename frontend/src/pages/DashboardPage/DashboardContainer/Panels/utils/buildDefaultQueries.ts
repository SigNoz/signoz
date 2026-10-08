import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import {
	initialQueriesMap,
	listViewInitialLogQuery,
} from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { toPerses } from '../../queryV5/persesQueryAdapters';
import { toPanelType, type PanelKind } from '../types/panelKind';

const TOP_LIST_DEFAULT_LIMIT = 10;

function withLimit(query: Query, limit: number): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((queryData) => ({
				...queryData,
				limit,
			})),
		},
	};
}

/** Seed query for a new panel. A list panel needs one (logs, timestamp desc) so its
 * preview runs on open, and a top list one capped to its top 10 groups (the server
 * already ranks by value, descending, when no order is set); other kinds start empty
 * and seed from the builder. */
export function buildDefaultQueries(kind: PanelKind): DashboardtypesQueryDTO[] {
	// `toPerses` pivots through the V1 `Query`, which is still keyed by panel type.
	if (kind === 'signoz/ListPanel') {
		return toPerses(listViewInitialLogQuery, toPanelType(kind));
	}
	if (kind === 'signoz/TopListPanel') {
		return toPerses(
			withLimit(initialQueriesMap[DataSource.METRICS], TOP_LIST_DEFAULT_LIMIT),
			toPanelType(kind),
		);
	}
	return [];
}
