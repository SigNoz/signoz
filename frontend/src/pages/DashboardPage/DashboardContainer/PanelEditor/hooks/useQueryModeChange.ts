import { type MutableRefObject, useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import {
	getQueryModeSignals,
	type SupportedQueryModesKindMap,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import {
	type BuildersByVariant,
	type Query,
	QueryMode,
} from 'types/api/queryBuilder/queryBuilderData';
import { getBuilderVariant, toBuilderVariant } from 'lib/query/queryMode';
import { seedBuilderForMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';

interface UseQueryModeChangeArgs {
	panelType: PANEL_TYPES;
	supportedQueryModesKindMap: SupportedQueryModesKindMap;
	/** Builder queries for the variant not on screen. */
	parkedBuilders: MutableRefObject<BuildersByVariant>;
}

/**
 * Tab switching. Query Builder and AI share `currentQuery.builder`, so crossing between
 * them swaps in the parked query, seeding a first visit; ClickHouse and PromQL pass through.
 */
export function useQueryModeChange({
	panelType,
	supportedQueryModesKindMap,
	parkedBuilders,
}: UseQueryModeChangeArgs): (key: string) => void {
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();

	return useCallback(
		(key: string): void => {
			const targetMode = key as QueryMode;
			const targetVariant = toBuilderVariant(targetMode);
			const heldVariant = getBuilderVariant(currentQuery.builder);

			const seedFor = (mode: QueryMode): Query['builder'] =>
				seedBuilderForMode({
					mode,
					defaultSignal: getQueryModeSignals(
						supportedQueryModesKindMap,
						QueryMode.QUERY_BUILDER,
					)[0],
					panelType,
					updateAllQueriesOperators,
				});

			// Keyed on what `builder` holds, not the active tab: ClickHouse → QB must not reseed.
			let { builder } = currentQuery;
			if (targetVariant && targetVariant !== heldVariant) {
				parkedBuilders.current[heldVariant] = currentQuery.builder;
				builder = parkedBuilders.current[targetVariant] ?? seedFor(targetMode);
				delete parkedBuilders.current[targetVariant];
			}

			redirectWithQueryBuilderData({
				...currentQuery,
				// An AI query is a builder query carrying the AI tag; its query type stays `builder`.
				queryType:
					targetMode === QueryMode.AI_QUERY_BUILDER
						? QueryMode.QUERY_BUILDER
						: targetMode,
				builder,
			});
		},
		[
			currentQuery,
			panelType,
			parkedBuilders,
			redirectWithQueryBuilderData,
			supportedQueryModesKindMap,
			updateAllQueriesOperators,
		],
	);
}
