import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { OPERATORS, QueryBuilderKeys } from 'constants/queryBuilder';
import { MetricsType } from 'container/MetricsApplication/constant';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearchV2/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { UseActiveLog } from './types';

export function getOldLogsOperatorFromNew(operator: string): string {
	switch (operator) {
		case OPERATORS['=']:
			return OPERATORS.IN;
		case OPERATORS['!=']:
			return OPERATORS.NIN;
		default:
			return operator;
	}
}
// eslint-disable-next-line sonarjs/cognitive-complexity
export const useActiveLog = (): UseActiveLog => {
	const queryClient = useQueryClient();
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const { notifications } = useNotifications();

	const [activeLog, setActiveLog] = useState<ILog | null>(null);

	// Close drawer/clear active log when query in URL changes
	const urlQuery = useUrlQuery();
	const compositeQuery = urlQuery.get(QueryParams.compositeQuery) ?? '';
	const prevQueryRef = useRef<string | null>(null);
	useEffect(() => {
		if (
			prevQueryRef.current !== null &&
			prevQueryRef.current !== compositeQuery
		) {
			setActiveLog(null);
		}
		prevQueryRef.current = compositeQuery;
	}, [compositeQuery]);

	const onSetActiveLog = useCallback((nextActiveLog: ILog): void => {
		setActiveLog(nextActiveLog);
	}, []);

	const onClearActiveLog = useCallback((): void => setActiveLog(null), []);

	const onAddToQueryExplorer = useCallback(
		async (
			fieldKey: string,
			fieldValue: string,
			operator: string,
			dataType?: DataTypes,
			fieldType?: MetricsType | undefined,
		): Promise<void> => {
			try {
				const keysAutocompleteResponse = await queryClient.fetchQuery(
					[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
					async () =>
						getAggregateKeys({
							searchText: fieldKey,
							aggregateOperator:
								currentQuery.builder.queryData[0].aggregateOperator || '',
							dataSource: currentQuery.builder.queryData[0].dataSource,
							aggregateAttribute:
								currentQuery.builder.queryData[0].aggregateAttribute?.key || '',
						}),
				);

				const keysAutocomplete: BaseAutocompleteData[] =
					keysAutocompleteResponse.payload?.attributeKeys || [];

				const existAutocompleteKey = chooseAutocompleteFromCustomValue(
					keysAutocomplete,
					fieldKey,
					dataType,
					fieldType,
				);

				const currentOperator = getOperatorValue(operator);

				const nextQuery: Query = {
					...currentQuery,
					builder: {
						...currentQuery.builder,
						queryData: currentQuery.builder.queryData.map((item) => ({
							...item,
							filters: {
								...item.filters,
								items: [
									...(item.filters?.items || []),
									{
										id: uuid(),
										key: existAutocompleteKey,
										op: currentOperator,
										value: fieldValue,
									},
								],
								op: item.filters?.op || 'AND',
							},
						})),
					},
				};

				redirectWithQueryBuilderData(nextQuery);
			} catch {
				notifications.error({ message: SOMETHING_WENT_WRONG });
			}
		},
		[currentQuery, notifications, queryClient, redirectWithQueryBuilderData],
	);

	const onGroupByAttribute = useCallback(
		async (fieldKey: string, dataType?: DataTypes): Promise<void> => {
			try {
				const keysAutocompleteResponse = await queryClient.fetchQuery(
					[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
					// eslint-disable-next-line sonarjs/no-identical-functions
					async () =>
						getAggregateKeys({
							searchText: fieldKey,
							aggregateOperator:
								currentQuery.builder.queryData[0].aggregateOperator || '',
							dataSource: currentQuery.builder.queryData[0].dataSource,
							aggregateAttribute:
								currentQuery.builder.queryData[0].aggregateAttribute?.key || '',
						}),
				);

				const keysAutocomplete: BaseAutocompleteData[] =
					keysAutocompleteResponse.payload?.attributeKeys || [];

				const existAutocompleteKey = chooseAutocompleteFromCustomValue(
					keysAutocomplete,
					fieldKey,
					dataType,
				);

				const nextQuery: Query = {
					...currentQuery,
					builder: {
						...currentQuery.builder,
						queryData: currentQuery.builder.queryData.map((item) => ({
							...item,
							groupBy: [...item.groupBy, existAutocompleteKey],
						})),
					},
				};

				redirectWithQueryBuilderData(nextQuery);
			} catch {
				notifications.error({ message: SOMETHING_WENT_WRONG });
			}
		},
		[currentQuery, notifications, queryClient, redirectWithQueryBuilderData],
	);

	return {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery: onAddToQueryExplorer,
		onGroupByAttribute,
	};
};
