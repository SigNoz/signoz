import { useCallback } from 'react';
import { QueryParams } from 'constants/query';
import { initialAutocompleteData, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useGetSavedViewParams } from './saveViews/useGetSavedViewParams';
import { useQueryBuilder } from './queryBuilder/useQueryBuilder';

export interface ICurrentQueryData {
	viewKey?: string;
	query: Query;
}

export type ChangeViewFunctionType = (
	view: ExplorerViews,
	querySearchParameters?: ICurrentQueryData,
) => void;

export const useHandleExplorerTabChange = (): {
	handleExplorerTabChange: (
		type: string,
		querySearchParameters?: ICurrentQueryData,
		redirectToUrl?: (typeof ROUTES)[keyof typeof ROUTES],
		newTab?: boolean,
	) => void;
} => {
	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
		updateQueriesData,
	} = useQueryBuilder();

	const { viewKey } = useGetSavedViewParams();

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
					orderBy: [],
					aggregateAttribute: initialAutocompleteData,
				}));
			}

			return query;
		},
		[currentQuery, updateAllQueriesOperators, updateQueriesData],
	);

	//TODO: this util is used not just to change explorer tab but also
	// for changing just the query or saved view. consider renaming this.
	const handleExplorerTabChange = useCallback(
		(
			type: string,
			currentQueryData?: ICurrentQueryData,
			redirectToUrl?: (typeof ROUTES)[keyof typeof ROUTES],
			newTab?: boolean,
		) => {
			const newPanelType = type as PANEL_TYPES;

			if (newPanelType === panelType && !currentQueryData) {
				return;
			}

			const query = currentQueryData?.query || getUpdateQuery(newPanelType);
			const nextViewKey = currentQueryData?.viewKey || viewKey;

			redirectWithQueryBuilderData(
				query,
				{
					[QueryParams.panelTypes]: newPanelType,
					...(nextViewKey ? { [QueryParams.viewKey]: nextViewKey } : {}),
				},
				redirectToUrl,
				undefined,
				newTab,
			);
		},
		[panelType, getUpdateQuery, redirectWithQueryBuilderData, viewKey],
	);

	return { handleExplorerTabChange };
};
