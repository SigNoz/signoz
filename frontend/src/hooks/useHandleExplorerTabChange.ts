import { querySearchParams } from 'components/ExplorerCard/constants';
import { initialAutocompleteData, PANEL_TYPES } from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import { SIGNOZ_VALUE } from 'container/QueryBuilder/filters/OrderByFilter/constants';
import { useCallback } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useGetSearchQueryParam } from './queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from './queryBuilder/useQueryBuilder';

export const useHandleExplorerTabChange = (): {
	handleExplorerTabChange: (
		type: string,
		querySearchParameters?: ICurrentQueryData,
	) => void;
} => {
	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
		updateQueriesData,
	} = useQueryBuilder();

	const viewName = useGetSearchQueryParam(querySearchParams.viewName) || '';

	const viewKey = useGetSearchQueryParam(querySearchParams.viewKey) || '';

	const getUpdateQuery = useCallback(
		(newPanelType: PANEL_TYPES): Query => {
			let query = updateAllQueriesOperators(
				currentQuery,
				newPanelType,
				DataSource.TRACES,
			);

			if (
				newPanelType === PANEL_TYPES.LIST ||
				newPanelType === PANEL_TYPES.TRACE
			) {
				query = updateQueriesData(query, 'queryData', (item) => ({
					...item,
					orderBy: item.orderBy.filter((item) => item.columnName !== SIGNOZ_VALUE),
					aggregateAttribute: initialAutocompleteData,
				}));
			}

			return query;
		},
		[currentQuery, updateAllQueriesOperators, updateQueriesData],
	);

	const handleExplorerTabChange = useCallback(
		(type: string, currentQueryData?: ICurrentQueryData) => {
			const newPanelType = type as PANEL_TYPES;

			if (newPanelType === panelType && !currentQueryData) return;

			const query = currentQueryData?.query || getUpdateQuery(newPanelType);

			redirectWithQueryBuilderData(query, {
				[queryParamNamesMap.panelTypes]: newPanelType,
				[querySearchParams.viewName]: currentQueryData?.name || viewName,
				[querySearchParams.viewKey]: currentQueryData?.uuid || viewKey,
			});
		},
		[getUpdateQuery, panelType, redirectWithQueryBuilderData, viewKey, viewName],
	);

	return { handleExplorerTabChange };
};

interface ICurrentQueryData {
	name: string;
	uuid: string;
	query: Query;
}
