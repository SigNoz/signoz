import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { OPERATORS, QueryBuilderKeys } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import { getGeneratedFilterQueryString } from 'lib/getGeneratedFilterQueryString';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { ILogsReducer } from 'types/reducer/logs';
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
export const useActiveLog = (): UseActiveLog => {
	const dispatch = useDispatch();

	const {
		searchFilter: { queryString },
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const queryClient = useQueryClient();
	const { pathname } = useLocation();
	const history = useHistory();
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const { notifications } = useNotifications();

	const isLogsPage = useMemo(() => pathname === ROUTES.OLD_LOGS_EXPLORER, [
		pathname,
	]);

	const [activeLog, setActiveLog] = useState<ILog | null>(null);

	const onSetDetailedLogData = useCallback(
		(logData: ILog) => {
			dispatch({
				type: SET_DETAILED_LOG_DATA,
				payload: logData,
			});
		},
		[dispatch],
	);

	const onSetActiveLog = useCallback(
		(nextActiveLog: ILog): void => {
			if (isLogsPage) {
				onSetDetailedLogData(nextActiveLog);
			} else {
				setActiveLog(nextActiveLog);
			}
		},
		[isLogsPage, onSetDetailedLogData],
	);

	const onClearActiveLog = useCallback((): void => setActiveLog(null), []);

	const onAddToQueryExplorer = useCallback(
		async (
			fieldKey: string,
			fieldValue: string,
			operator: string,
			isJSON?: boolean,
			dataType?: DataTypes,
		): Promise<void> => {
			try {
				const keysAutocompleteResponse = await queryClient.fetchQuery(
					[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
					async () =>
						getAggregateKeys({
							searchText: fieldKey,
							aggregateOperator: currentQuery.builder.queryData[0].aggregateOperator,
							dataSource: currentQuery.builder.queryData[0].dataSource,
							aggregateAttribute:
								currentQuery.builder.queryData[0].aggregateAttribute.key,
						}),
				);

				const keysAutocomplete: BaseAutocompleteData[] =
					keysAutocompleteResponse.payload?.attributeKeys || [];

				const existAutocompleteKey = chooseAutocompleteFromCustomValue(
					keysAutocomplete,
					fieldKey,
					isJSON,
					dataType,
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
									...item.filters.items,
									{
										id: uuid(),
										key: existAutocompleteKey,
										op: currentOperator,
										value: fieldValue,
									},
								],
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
		async (
			fieldKey: string,
			isJSON?: boolean,
			dataType?: DataTypes,
		): Promise<void> => {
			try {
				const keysAutocompleteResponse = await queryClient.fetchQuery(
					[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
					// eslint-disable-next-line sonarjs/no-identical-functions
					async () =>
						getAggregateKeys({
							searchText: fieldKey,
							aggregateOperator: currentQuery.builder.queryData[0].aggregateOperator,
							dataSource: currentQuery.builder.queryData[0].dataSource,
							aggregateAttribute:
								currentQuery.builder.queryData[0].aggregateAttribute.key,
						}),
				);

				const keysAutocomplete: BaseAutocompleteData[] =
					keysAutocompleteResponse.payload?.attributeKeys || [];

				const existAutocompleteKey = chooseAutocompleteFromCustomValue(
					keysAutocomplete,
					fieldKey,
					isJSON,
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
	const onAddToQueryLogs = useCallback(
		(fieldKey: string, fieldValue: string, operator: string) => {
			const newOperator = getOldLogsOperatorFromNew(operator);
			const updatedQueryString = getGeneratedFilterQueryString(
				fieldKey,
				fieldValue,
				newOperator,
				queryString,
			);

			history.replace(`${ROUTES.OLD_LOGS_EXPLORER}?q=${updatedQueryString}`);
		},
		[history, queryString],
	);

	return {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery: isLogsPage ? onAddToQueryLogs : onAddToQueryExplorer,
		onGroupByAttribute,
	};
};
