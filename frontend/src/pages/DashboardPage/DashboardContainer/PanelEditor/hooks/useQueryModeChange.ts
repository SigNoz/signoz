import { useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import {
	getQueryTypeSignals,
	type SupportedQueryTypesKindMap,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import { seedBuilderForMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';

interface UseQueryModeChangeArgs {
	panelType: PANEL_TYPES;
	supportedQueryTypesKindMap: SupportedQueryTypesKindMap;
}

/**
 * Tab switching: each query type keeps its own slot, so a switch only changes `queryType`.
 * A builder slot is seeded when it can't be used as-is: an AI slot never opened, or
 * Query Builder queries on a signal this kind can't author (an AI panel's default).
 */
export function useQueryModeChange({
	panelType,
	supportedQueryTypesKindMap,
}: UseQueryModeChangeArgs): (key: string) => void {
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();

	return useCallback(
		(key: string): void => {
			const queryType = key as EQueryType;
			const builderSignals = getQueryTypeSignals(
				supportedQueryTypesKindMap,
				EQueryType.QUERY_BUILDER,
			);
			const seed = (): Query['builder'] =>
				seedBuilderForMode({
					mode: queryType,
					defaultSignal: builderSignals[0],
					panelType,
					updateAllQueriesOperators,
				});

			const next: Query = { ...currentQuery, queryType };
			if (queryType === EQueryType.AI_QUERY_BUILDER && !next.builder_ai_query) {
				next.builder_ai_query = seed();
			}
			const authorableSignals = new Set<string>(builderSignals);
			const builderFitsKind =
				next.builder.queryData.length > 0 &&
				next.builder.queryData.every((query) =>
					authorableSignals.has(query.dataSource),
				);
			if (queryType === EQueryType.QUERY_BUILDER && !builderFitsKind) {
				next.builder = seed();
			}

			redirectWithQueryBuilderData(next);
		},
		[
			currentQuery,
			panelType,
			redirectWithQueryBuilderData,
			supportedQueryTypesKindMap,
			updateAllQueriesOperators,
		],
	);
}
