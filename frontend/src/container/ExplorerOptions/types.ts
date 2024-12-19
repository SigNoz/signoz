import { NotificationInstance } from 'antd/es/notification/interface';
import { AxiosResponse } from 'axios';
import { SaveViewWithNameProps } from 'components/ExplorerCard/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dispatch, SetStateAction } from 'react';
import { UseMutateAsyncFunction } from 'react-query';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { SaveViewPayloadProps, SaveViewProps } from 'types/api/saveViews/types';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import { PreservedViewsTypes } from './constants';

export interface SaveNewViewHandlerProps {
	viewName: string;
	compositeQuery: ICompositeMetricQuery;
	sourcePage: DataSource;
	extraData: SaveViewProps['extraData'];
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
	setNewViewName: Dispatch<SetStateAction<string>>;
}

export type PreservedViewType =
	| PreservedViewsTypes.LOGS
	| PreservedViewsTypes.TRACES;

export type PreservedViewsInLocalStorage = Partial<
	Record<PreservedViewType, { key: string; value: string }>
>;
