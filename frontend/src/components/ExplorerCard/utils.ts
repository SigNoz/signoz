import { NotificationInstance } from 'antd/es/notification/interface';
import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import {
	queryParamNamesMap,
	querySearchParams,
} from 'constants/queryBuilderQueryNames';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { isEqual } from 'lodash-es';
import { UseMutateAsyncFunction } from 'react-query';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

import {
	GetViewDetailsUsingViewKey,
	IsQueryUpdatedInViewProps,
	SaveViewHandlerProps,
	UpdateQueryHandlerProps,
} from './types';

export const getViewDetailsUsingViewKey: GetViewDetailsUsingViewKey = (
	viewKey,
	data,
) => {
	const selectedView = data?.find((view) => view.uuid === viewKey);
	if (selectedView) {
		const { compositeQuery, name, uuid } = selectedView;
		const query = mapQueryDataFromApi(compositeQuery);
		return { query, name, uuid };
	}
	return undefined;
};

export const updateQueryHandler = async ({
	updateViewAsync,
	compositeQuery,
	viewName,
	viewKey,
	sourcePage,
	extraData,
	setIsQueryUpdated,
	notifications,
}: UpdateQueryHandlerProps): Promise<void> => {
	try {
		await updateViewAsync({
			compositeQuery,
			viewKey,
			extraData,
			sourcePage,
			viewName,
		});
		setIsQueryUpdated(false);
		notifications.success({
			message: 'View Updated Successfully',
		});
	} catch (err) {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	}
};

export const isQueryUpdatedInView = ({
	viewKey,
	data,
	stagedQuery,
}: IsQueryUpdatedInViewProps): boolean => {
	const currentViewDetails = getViewDetailsUsingViewKey(viewKey, data);
	if (!currentViewDetails) {
		return false;
	}
	const { query } = currentViewDetails;

	const updatedCurrentQuery = {
		...stagedQuery,
		builder: {
			...stagedQuery?.builder,
			queryData: stagedQuery?.builder.queryData.map((queryData) => {
				const newAggregateAttribute = queryData.aggregateAttribute;
				delete newAggregateAttribute.id;
				return {
					...queryData,
					aggregateAttribute: {},
					groupBy: [],
				};
			}),
		},
	};

	console.log('Difference', updatedCurrentQuery.builder, query.builder);

	return (
		!isEqual(query.builder, updatedCurrentQuery?.builder) ||
		!isEqual(query.clickhouse_sql, updatedCurrentQuery?.clickhouse_sql) ||
		!isEqual(query.promql, updatedCurrentQuery?.promql)
	);
};

export const saveViewHandler = async ({
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
}: SaveViewHandlerProps): Promise<void> => {
	try {
		const { data } = await saveViewAsync({
			viewName,
			compositeQuery,
			sourcePage,
			extraData,
		});
		refetchAllView();
		redirectWithQueryBuilderData(mapQueryDataFromApi(compositeQuery), {
			[queryParamNamesMap.panelTypes]: panelType,
			[querySearchParams.viewName]: viewName,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			[querySearchParams.viewKey]: data.data,
		});
		notifications.success({
			message: 'View Saved Successfully',
		});
	} catch (err) {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	} finally {
		handlePopOverClose();
	}
};

export const deleteViewHandler = async ({
	deleteViewAsync,
	refetchAllView,
	redirectWithQueryBuilderData,
	notifications,
	panelType,
	viewKey,
	viewId,
}: DeleteViewHandlerProps): Promise<void> => {
	try {
		await deleteViewAsync(viewId);
		refetchAllView();
		console.log('ViewKey', viewKey, viewId);
		if (viewKey === viewId) {
			redirectWithQueryBuilderData(initialQueriesMap.traces, {
				[querySearchParams.viewName]: 'Query Builder',
				[queryParamNamesMap.panelTypes]: panelType,
			});
		}
		notifications.success({
			message: 'View Deleted Successfully',
		});
	} catch (err) {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	}
};

interface DeleteViewHandlerProps {
	deleteViewAsync: UseMutateAsyncFunction<DeleteViewPayloadProps, Error, string>;
	refetchAllView: VoidFunction;
	redirectWithQueryBuilderData: (
		query: Query,
		searchParams?: Record<string, unknown> | undefined,
	) => void;
	notifications: NotificationInstance;
	panelType: PANEL_TYPES | null;
	viewKey: string;
	viewId: string;
}
