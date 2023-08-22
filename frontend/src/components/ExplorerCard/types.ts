import { NotificationInstance } from 'antd/es/notification/interface';
import { SetStateAction } from 'react';
import { UseMutateAsyncFunction } from 'react-query';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import {
	UpdateViewPayloadProps,
	UpdateViewProps,
	ViewProps,
} from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

export interface ExplorerCardProps {
	sourcepage: Lowercase<keyof typeof DataSource>;
	children: React.ReactNode;
}

export type GetViewDetailsUsingViewKey = (
	viewKey: string,
	data: ViewProps[] | undefined,
) => { query: Query; name: string; uuid: string } | undefined;

export interface UpdateQueryHandlerProps {
	updateViewAsync: UseMutateAsyncFunction<
		UpdateViewPayloadProps,
		Error,
		UpdateViewProps,
		UpdateViewPayloadProps
	>;
	compositeQuery: ICompositeMetricQuery;
	viewName: string;
	viewKey: string;
	sourcePage: string;
	extraData: string;
	setIsQueryUpdated: (value: SetStateAction<boolean>) => void;
	notifications: NotificationInstance;
}

export interface IsQueryUpdatedInViewProps {
	viewKey: string;
	data: ViewProps[] | undefined;
	stagedQuery: Query | null;
}
