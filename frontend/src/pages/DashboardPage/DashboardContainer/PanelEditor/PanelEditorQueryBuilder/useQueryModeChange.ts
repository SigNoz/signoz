import { useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { QueryMode } from 'types/common/dashboard';

import {
	getQueryModeSignals,
	type SupportedQueryModes,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { getBuilderMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/queryMode';
import { seedBuilderForMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';
import { useQueryModeCacheStore } from 'pages/DashboardPage/DashboardContainer/store/useQueryModeCacheStore';

interface UseQueryModeChangeArgs {
	panelKind: PanelKind;
	panelType: PANEL_TYPES;
	supportedQueryModes: SupportedQueryModes;
}

function isBuilderMode(mode: QueryMode): boolean {
	return mode === QueryMode.QUERY_BUILDER || mode === QueryMode.AI_QUERY_BUILDER;
}

/**
 * Tab switching. Query Builder and AI both author `currentQuery.builder`, so entering one
 * parks the other's query under this kind — ClickHouse and PromQL own separate slots on the
 * query and pass through untouched.
 */
export function useQueryModeChange({
	panelKind,
	panelType,
	supportedQueryModes,
}: UseQueryModeChangeArgs): (key: string) => void {
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();
	const parkedByKind = useQueryModeCacheStore((store) => store.byKind);
	const park = useQueryModeCacheStore((store) => store.park);

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
				park(panelKind, held, currentQuery.builder);
				builder = parkedByKind[panelKind]?.[target] ?? seedFor(target);
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
			panelKind,
			panelType,
			park,
			parkedByKind,
			redirectWithQueryBuilderData,
			supportedQueryModes,
			updateAllQueriesOperators,
		],
	);
}
