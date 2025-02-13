import { NotificationInstance } from 'antd/es/notification/interface';
import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import isEqual from 'lodash-es/isEqual';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	DeleteViewHandlerProps,
	GetViewDetailsUsingViewKey,
	IsQueryUpdatedInViewProps,
	SaveViewHandlerProps,
} from './types';

export const showErrorNotification = (
	notifications: NotificationInstance,
	err: Error,
): void => {
	notifications.error({
		message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
	});
};

export const getViewDetailsUsingViewKey: GetViewDetailsUsingViewKey = (
	viewKey,
	data,
) => {
	const selectedView = data?.find((view) => view.uuid === viewKey);
	if (selectedView) {
		const { compositeQuery, name, uuid, extraData } = selectedView;
		const query = mapQueryDataFromApi(compositeQuery);
		return { query, name, uuid, panelType: compositeQuery.panelType, extraData };
	}
	return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const omitIdFromQuery = (query: Query | null): any => ({
	...query,
	builder: {
		...query?.builder,
		queryData: query?.builder.queryData.map((queryData) => {
			const { id, ...rest } = queryData.aggregateAttribute;
			const newAggregateAttribute = rest;
			const newGroupByAttributes = queryData.groupBy.map((groupByAttribute) => {
				const { id, ...rest } = groupByAttribute;
				return rest;
			});
			const newItems = queryData.filters.items.map((item) => {
				const { id, ...newItem } = item;
				if (item.key) {
					const { id, ...rest } = item.key;
					return {
						...newItem,
						key: rest,
					};
				}
				return newItem;
			});
			return {
				...queryData,
				aggregateAttribute: newAggregateAttribute,
				groupBy: newGroupByAttributes,
				filters: {
					...queryData.filters,
					items: newItems,
				},
				limit: queryData.limit ? queryData.limit : 0,
				offset: queryData.offset ? queryData.offset : 0,
				pageSize: queryData.pageSize ? queryData.pageSize : 0,
			};
		}),
	},
});

export const isQueryUpdatedInView = ({
	viewKey,
	data,
	stagedQuery,
	currentPanelType,
	options,
}: IsQueryUpdatedInViewProps): boolean => {
	const currentViewDetails = getViewDetailsUsingViewKey(viewKey, data);
	if (!currentViewDetails) {
		return false;
	}
	const { query, panelType, extraData } = currentViewDetails;

	// Omitting id from aggregateAttribute and groupBy
	const updatedCurrentQuery = omitIdFromQuery(stagedQuery);

	if (
		updatedCurrentQuery?.builder === undefined ||
		updatedCurrentQuery.clickhouse_sql === undefined ||
		updatedCurrentQuery.promql === undefined
	) {
		return false;
	}
	return (
		panelType !== currentPanelType ||
		!isEqual(query.builder, updatedCurrentQuery?.builder) ||
		!isEqual(query.clickhouse_sql, updatedCurrentQuery?.clickhouse_sql) ||
		!isEqual(query.promql, updatedCurrentQuery?.promql) ||
		!isEqual(
			options?.selectColumns,
			extraData && JSON.parse(extraData)?.selectColumns,
		)
	);
};

export const saveViewHandler = ({
	saveViewAsync,
	refetchAllView,
	notifications,
	handlePopOverClose,
	viewName,
	compositeQuery,
	sourcePage,
	extraData,
	redirectWithQueryBuilderData,
	panelType,
	form,
}: SaveViewHandlerProps): void => {
	saveViewAsync(
		{
			viewName,
			compositeQuery,
			sourcePage,
			extraData,
		},
		{
			onSuccess: (data) => {
				refetchAllView();
				redirectWithQueryBuilderData(mapQueryDataFromApi(compositeQuery), {
					[QueryParams.panelTypes]: panelType,
					[QueryParams.viewName]: viewName,
					[QueryParams.viewKey]: data.data.data,
				});
				notifications.success({
					message: 'View Saved Successfully',
				});
			},
			onError: (err) => {
				showErrorNotification(notifications, err);
			},
			onSettled: () => {
				handlePopOverClose();
				form.resetFields();
			},
		},
	);
};

export const deleteViewHandler = ({
	deleteViewAsync,
	refetchAllView,
	redirectWithQueryBuilderData,
	notifications,
	panelType,
	viewKey,
	viewId,
	updateAllQueriesOperators,
	sourcePage,
}: DeleteViewHandlerProps): void => {
	deleteViewAsync(viewKey, {
		onSuccess: () => {
			if (viewId === viewKey) {
				redirectWithQueryBuilderData(
					updateAllQueriesOperators(
						initialQueriesMap[sourcePage],
						panelType || PANEL_TYPES.LIST,
						sourcePage,
					),
					{
						[QueryParams.viewName]: '',
						[QueryParams.panelTypes]: panelType,
						[QueryParams.viewKey]: '',
					},
				);
			}
			notifications.success({
				message: 'View Deleted Successfully',
			});
			refetchAllView();
		},
		onError: (err) => {
			showErrorNotification(notifications, err);
		},
	});
};

export const trimViewName = (viewName: string): string => {
	if (viewName.length > 20) {
		return `${viewName.substring(0, 20)}...`;
	}
	return viewName;
};
