import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryParams } from 'constants/query';
import {
	initialAutocompleteData,
	PANEL_TYPES,
	QueryBuilderKeys,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { SIGNOZ_VALUE } from 'container/QueryBuilder/filters/OrderByFilter/constants';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useGetSearchQueryParam } from './queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from './queryBuilder/useQueryBuilder';

export interface ICurrentQueryData {
	name: string;
	id: string;
	query: Query;
}

export const useHandleExplorerTabChange = (): {
	handleExplorerTabChange: (
		type: string,
		querySearchParameters?: ICurrentQueryData,
		redirectToUrl?: typeof ROUTES[keyof typeof ROUTES],
		fieldKey?: string,
	) => Promise<void>;
} => {
	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
		updateQueriesData,
	} = useQueryBuilder();
	const queryClient = useQueryClient();

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
		async (
			type: string,
			currentQueryData?: ICurrentQueryData,
			redirectToUrl?: typeof ROUTES[keyof typeof ROUTES],
			fieldKey?: string,
		) => {
			const newPanelType = type as PANEL_TYPES;

			if (newPanelType === panelType && !currentQueryData) return;

			const query = currentQueryData?.query || getUpdateQuery(newPanelType);

			const redirectParams = {
				[QueryParams.panelTypes]: newPanelType,
				[QueryParams.viewName]: currentQueryData?.name || viewName,
				[QueryParams.viewKey]: currentQueryData?.id || viewKey,
			};

			const redirect = (nextQuery: Query): void => {
				if (redirectToUrl) {
					redirectWithQueryBuilderData(nextQuery, redirectParams, redirectToUrl);
					return;
				}

				redirectWithQueryBuilderData(nextQuery, redirectParams);
			};

			if (!fieldKey) {
				redirect(query);
				return;
			}

			const keysAutocompleteResponse = await queryClient.fetchQuery(
				[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
				async () =>
					getAggregateKeys({
						searchText: fieldKey,
						aggregateOperator: query.builder.queryData[0].aggregateOperator || '',
						dataSource: query.builder.queryData[0].dataSource,
						aggregateAttribute:
							query.builder.queryData[0].aggregateAttribute?.key || '',
					}),
			);

			const keysAutocomplete: BaseAutocompleteData[] =
				keysAutocompleteResponse.payload?.attributeKeys || [];
			// Extract dataType from the matched key in autocomplete results
			const matchedKey = keysAutocomplete.find((key) => key.key === fieldKey);
			const dataType = matchedKey?.dataType;

			const existAutocompleteKey = chooseAutocompleteFromCustomValue(
				keysAutocomplete,
				fieldKey,
				dataType,
			);
			const nextQuery: Query = {
				...query,
				builder: {
					...query.builder,
					queryData: query.builder.queryData.map((item) => ({
						...item,
						groupBy: [...item.groupBy, existAutocompleteKey],
					})),
				},
			};

			redirect(nextQuery);
		},
		[
			panelType,
			getUpdateQuery,
			queryClient,
			redirectWithQueryBuilderData,
			viewName,
			viewKey,
		],
	);

	return { handleExplorerTabChange };
};
