import { useMemo } from 'react';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

/**
 * Resolves which query-builder query index the checkbox filter reads from and
 * writes to.
 *
 * In ListView most sources use index 0; TRACES_EXPLORER and every non-ListView
 * mode track the last focused query.
 */
function useActiveQueryIndex(source: QuickFiltersSource): number {
	const { lastUsedQuery, panelType } = useQueryBuilder();
	const isListView = panelType === PANEL_TYPES.LIST;

	return useMemo(() => {
		if (isListView) {
			return source === QuickFiltersSource.TRACES_EXPLORER
				? lastUsedQuery || 0
				: 0;
		}
		return lastUsedQuery || 0;
	}, [isListView, source, lastUsedQuery]);
}

export default useActiveQueryIndex;
