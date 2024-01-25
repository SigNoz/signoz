import { QueryParams } from 'constants/query';
import { initialAutocompleteData, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
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
		redirectToUrl?: typeof ROUTES[keyof typeof ROUTES],
	) => void;
} => {
	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
		updateQueriesData,
	} = useQueryBuilder();

	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';

	const viewKey = useGetSearchQueryParam(QueryParams.viewKey) || '';

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
		(
			type: string,
			currentQueryData?: ICurrentQueryData,
			redirectToUrl?: typeof ROUTES[keyof typeof ROUTES],
		) => {
			const newPanelType = type as PANEL_TYPES;

			if (newPanelType === panelType && !currentQueryData) return;

			const query = currentQueryData?.query || getUpdateQuery(newPanelType);

			if (redirectToUrl) {
				redirectWithQueryBuilderData(
					query,
					{
						[QueryParams.panelTypes]: newPanelType,
						[QueryParams.viewName]: currentQueryData?.name || viewName,
						[QueryParams.viewKey]: currentQueryData?.uuid || viewKey,
					},
					redirectToUrl,
				);
			} else {
				redirectWithQueryBuilderData(query, {
					[QueryParams.panelTypes]: newPanelType,
					[QueryParams.viewName]: currentQueryData?.name || viewName,
					[QueryParams.viewKey]: currentQueryData?.uuid || viewKey,
				});
			}
		},
		[panelType, getUpdateQuery, redirectWithQueryBuilderData, viewName, viewKey],
	);

	return { handleExplorerTabChange };
};

interface ICurrentQueryData {
	name: string;
	uuid: string;
	query: Query;
}
