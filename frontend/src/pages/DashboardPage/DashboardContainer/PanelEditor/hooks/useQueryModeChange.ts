import { type MutableRefObject, useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { QueryMode } from 'types/common/dashboard';

import {
	getQueryModeSignals,
	type SupportedQueryModes,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import {
	type BuilderStash,
	getBuilderMode,
	isBuilderMode,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/queryMode';
import { seedBuilderForMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';

interface UseQueryModeChangeArgs {
	panelType: PANEL_TYPES;
	supportedQueryModes: SupportedQueryModes;
	/** Builder queries for the tabs not on screen, keyed by mode. */
	parkedBuilders: MutableRefObject<BuilderStash>;
}

/**
 * Tab switching. Query Builder and AI share `currentQuery.builder`, so crossing between
 * them swaps in the parked query, seeding a first visit; ClickHouse and PromQL pass through.
 */
export function useQueryModeChange({
	panelType,
	supportedQueryModes,
	parkedBuilders,
}: UseQueryModeChangeArgs): (key: string) => void {
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();

	return useCallback(
		(key: string): void => {
			const target = key as QueryMode;
			const held = getBuilderMode(currentQuery.builder);

			const seedFor = (mode: QueryMode): Query['builder'] =>
				seedBuilderForMode({
					mode,
					defaultSignal: getQueryModeSignals(
						supportedQueryModes,
						QueryMode.QUERY_BUILDER,
					)[0],
					panelType,
					updateAllQueriesOperators,
				});

			// Keyed on what `builder` holds, not the active tab: ClickHouse → QB must not reseed.
			let { builder } = currentQuery;
			if (isBuilderMode(target) && target !== held) {
				parkedBuilders.current[held] = currentQuery.builder;
				builder = parkedBuilders.current[target] ?? seedFor(target);
				delete parkedBuilders.current[target];
			}

			redirectWithQueryBuilderData({
				...currentQuery,
				// An AI query is a builder query carrying the AI tag; its query type stays `builder`.
				queryType:
					target === QueryMode.AI_QUERY_BUILDER ? QueryMode.QUERY_BUILDER : target,
				builder,
			});
		},
		[
			currentQuery,
			panelType,
			parkedBuilders,
			redirectWithQueryBuilderData,
			supportedQueryModes,
			updateAllQueriesOperators,
		],
	);
}
