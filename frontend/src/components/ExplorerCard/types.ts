import { NotificationInstance } from 'antd/es/notification/interface';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { SetStateAction } from 'react';
import { UseMutateAsyncFunction } from 'react-query';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import {
	DeleteViewPayloadProps,
	SaveViewPayloadProps,
	SaveViewProps,
	UpdateViewPayloadProps,
	UpdateViewProps,
	ViewProps,
} from 'types/api/saveViews/types';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

export interface ExplorerCardProps {
	sourcepage: Lowercase<keyof typeof DataSource>;
	children: React.ReactNode;
}

export type GetViewDetailsUsingViewKey = (
	viewKey: string,
	data: ViewProps[] | undefined,
) => { query: Query; name: string; uuid: string } | undefined;

export interface UpdateQueryHandlerProps {
	compositeQuery: ICompositeMetricQuery;
	viewName: string;
	viewKey: string;
	sourcePage: ExplorerCardProps['sourcepage'];
	extraData: string;
	notifications: NotificationInstance;
	setIsQueryUpdated: (value: SetStateAction<boolean>) => void;
	updateViewAsync: UseMutateAsyncFunction<
		UpdateViewPayloadProps,
		Error,
		UpdateViewProps,
		UpdateViewPayloadProps
	>;
}

export interface IsQueryUpdatedInViewProps {
	viewKey: string;
	data: ViewProps[] | undefined;
	stagedQuery: Query | null;
}

export interface SaveViewWithNameProps {
	sourcePage: ExplorerCardProps['sourcepage'];
	handlePopOverClose: VoidFunction;
	refetchAllView: VoidFunction;
}

export interface MenuItemLabelGeneratorProps {
	viewName: string;
	viewKey: string;
	createdBy: string;
	uuid: string;
	refetchAllView: VoidFunction;
	onMenuItemSelectHandler: ({ key }: { key: string }) => void;
}

export interface SaveViewHandlerProps {
	viewName: string;
	compositeQuery: ICompositeMetricQuery;
	sourcePage: ExplorerCardProps['sourcepage'];
	extraData: string;
	panelType: PANEL_TYPES | null;
	notifications: NotificationInstance;
	refetchAllView: SaveViewWithNameProps['refetchAllView'];
	saveViewAsync: UseMutateAsyncFunction<
		SaveViewPayloadProps,
		Error,
		SaveViewProps,
		SaveViewPayloadProps
	>;
	handlePopOverClose: SaveViewWithNameProps['handlePopOverClose'];
	redirectWithQueryBuilderData: QueryBuilderContextType['redirectWithQueryBuilderData'];
}

export interface DeleteViewHandlerProps {
	deleteViewAsync: UseMutateAsyncFunction<DeleteViewPayloadProps, Error, string>;
	refetchAllView: MenuItemLabelGeneratorProps['refetchAllView'];
	redirectWithQueryBuilderData: QueryBuilderContextType['redirectWithQueryBuilderData'];
	notifications: NotificationInstance;
	panelType: PANEL_TYPES | null;
	viewKey: string;
	viewId: string;
}
