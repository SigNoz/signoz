import { FormInstance } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { AxiosResponse } from 'axios';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { UseMutateAsyncFunction } from 'react-query';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import {
	DeleteViewPayloadProps,
	SaveViewPayloadProps,
	SaveViewProps,
	ViewProps,
} from 'types/api/saveViews/types';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

export interface ExplorerCardProps {
	sourcepage: DataSource;
	children: React.ReactNode;
}

export type GetViewDetailsUsingViewKey = (
	viewKey: string,
	data: ViewProps[] | undefined,
) =>
	| {
			query: Query;
			name: string;
			uuid: string;
			panelType: PANEL_TYPES;
			extraData?: string;
	  }
	| undefined;

export interface IsQueryUpdatedInViewProps {
	viewKey: string;
	data: ViewProps[] | undefined;
	stagedQuery: Query | null;
	currentPanelType: PANEL_TYPES | null;
	options: OptionsQuery;
}

export interface SaveViewWithNameProps {
	sourcePage: ExplorerCardProps['sourcepage'];
	handlePopOverClose: VoidFunction;
	refetchAllView: VoidFunction;
}

export interface SaveViewFormProps {
	viewName: string;
}

export interface MenuItemLabelGeneratorProps {
	viewName: string;
	viewKey: string;
	createdBy: string;
	uuid: string;
	viewData: ViewProps[];
	refetchAllView: VoidFunction;
	sourcePage: ExplorerCardProps['sourcepage'];
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
		AxiosResponse<SaveViewPayloadProps>,
		Error,
		SaveViewProps,
		SaveViewPayloadProps
	>;
	handlePopOverClose: SaveViewWithNameProps['handlePopOverClose'];
	redirectWithQueryBuilderData: QueryBuilderContextType['redirectWithQueryBuilderData'];
	form: FormInstance<SaveViewFormProps>;
}

export interface DeleteViewHandlerProps {
	deleteViewAsync: UseMutateAsyncFunction<DeleteViewPayloadProps, Error, string>;
	refetchAllView: MenuItemLabelGeneratorProps['refetchAllView'];
	redirectWithQueryBuilderData: QueryBuilderContextType['redirectWithQueryBuilderData'];
	notifications: NotificationInstance;
	panelType: PANEL_TYPES | null;
	viewKey: string;
	viewId: string;
	updateAllQueriesOperators: QueryBuilderContextType['updateAllQueriesOperators'];
	sourcePage: ExplorerCardProps['sourcepage'];
}
