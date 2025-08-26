import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { convertFiltersToExpressionWithExistingQuery } from 'components/QueryBuilderV2/utils';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export interface UseTraceActionsReturn {
	onAddToQuery: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
	) => Promise<void>;
	onGroupByAttribute: (fieldKey: string) => Promise<void>;
	onCopyFieldName: (fieldName: string) => void;
	onCopyFieldValue: (fieldValue: string) => void;
}

export const useTraceActions = (): UseTraceActionsReturn => {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const queryClient = useQueryClient();
	const { notifications } = useNotifications();
	const [, setCopy] = useCopyToClipboard();

	const removeExistingFieldFilters = useCallback(
		(filters: TagFilterItem[], fieldKey: BaseAutocompleteData): TagFilterItem[] =>
			filters.filter((filter: TagFilterItem) => filter.key?.key !== fieldKey.key),
		[],
	);

	const getAutocompleteKey = useCallback(
		async (fieldKey: string): Promise<BaseAutocompleteData> => {
			const keysAutocompleteResponse = await queryClient.fetchQuery(
				[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
				async () =>
					getAggregateKeys({
						searchText: fieldKey,
						aggregateOperator:
							currentQuery.builder.queryData[0].aggregateOperator || '',
						dataSource: DataSource.TRACES,
						aggregateAttribute:
							currentQuery.builder.queryData[0].aggregateAttribute?.key || '',
					}),
			);

			const keysAutocomplete: BaseAutocompleteData[] =
				keysAutocompleteResponse.payload?.attributeKeys || [];

			return chooseAutocompleteFromCustomValue(
				keysAutocomplete,
				fieldKey,
				DataTypes.String,
			);
		},
		[queryClient, currentQuery.builder.queryData],
	);

	const onAddToQuery = useCallback(
		async (
			fieldKey: string,
			fieldValue: string,
			operator: string,
		): Promise<void> => {
			try {
				const existAutocompleteKey = await getAutocompleteKey(fieldKey);
				const currentOperator = getOperatorValue(operator);

				const nextQuery: Query = {
					...currentQuery,
					builder: {
						...currentQuery.builder,
						queryData: currentQuery.builder.queryData.map((item) => {
							// Get existing filters and remove any for the same field
							const currentFilters = item.filters?.items || [];
							const cleanedFilters = removeExistingFieldFilters(
								currentFilters,
								existAutocompleteKey,
							);

							// Add the new filter to the cleaned list
							const newFilters = [
								...cleanedFilters,
								{
									id: uuid(),
									key: existAutocompleteKey,
									op: currentOperator,
									value: fieldValue,
								},
							];

							const convertedFilter = convertFiltersToExpressionWithExistingQuery(
								{
									items: newFilters,
									op: item.filters?.op || 'AND',
								},
								item.filter?.expression || '',
							);

							return {
								...item,
								dataSource: DataSource.TRACES,
								filters: convertedFilter.filters,
								filter: convertedFilter.filter,
							};
						}),
					},
				};

				redirectWithQueryBuilderData(nextQuery, {}, ROUTES.TRACES_EXPLORER);
			} catch {
				notifications.error({ message: SOMETHING_WENT_WRONG });
			}
		},
		[
			currentQuery,
			notifications,
			getAutocompleteKey,
			redirectWithQueryBuilderData,
			removeExistingFieldFilters,
		],
	);

	const onGroupByAttribute = useCallback(
		async (fieldKey: string): Promise<void> => {
			try {
				const existAutocompleteKey = await getAutocompleteKey(fieldKey);

				const nextQuery: Query = {
					...currentQuery,
					builder: {
						...currentQuery.builder,
						queryData: currentQuery.builder.queryData.map((item) => ({
							...item,
							dataSource: DataSource.TRACES,
							groupBy: [...item.groupBy, existAutocompleteKey],
						})),
					},
				};

				redirectWithQueryBuilderData(nextQuery, {}, ROUTES.TRACES_EXPLORER);
			} catch {
				notifications.error({ message: SOMETHING_WENT_WRONG });
			}
		},
		[
			currentQuery,
			notifications,
			getAutocompleteKey,
			redirectWithQueryBuilderData,
		],
	);

	const onCopyFieldName = useCallback(
		(fieldName: string): void => {
			setCopy(fieldName);
			notifications.success({
				message: 'Field name copied to clipboard',
			});
		},
		[setCopy, notifications],
	);

	const onCopyFieldValue = useCallback(
		(fieldValue: string): void => {
			setCopy(fieldValue);
			notifications.success({
				message: 'Field value copied to clipboard',
			});
		},
		[setCopy, notifications],
	);

	return {
		onAddToQuery,
		onGroupByAttribute,
		onCopyFieldName,
		onCopyFieldValue,
	};
};
