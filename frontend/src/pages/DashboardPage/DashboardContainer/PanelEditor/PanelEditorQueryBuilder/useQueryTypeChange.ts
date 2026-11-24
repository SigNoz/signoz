import { useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { EQueryType } from 'types/common/dashboard';

import type { SupportedQueryTypesKindMap } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import { fitQueryToKind } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';

interface UseQueryTypeChangeArgs {
	panelType: PANEL_TYPES;
	supportedQueryTypesKindMap: SupportedQueryTypesKindMap;
}

/**
 * Tab switching: each query type keeps its own slot, so a switch only changes `queryType`.
 * A builder slot is seeded when it can't be used as-is (see `fitQueryToKind`).
 */
export function useQueryTypeChange({
	panelType,
	supportedQueryTypesKindMap,
}: UseQueryTypeChangeArgs): (queryType: EQueryType) => void {
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();

	return useCallback(
		(queryType: EQueryType): void => {
			const next = fitQueryToKind(
				{ ...currentQuery, queryType },
				{ supportedQueryTypesKindMap, panelType, updateAllQueriesOperators },
			);
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
