import { DataSource } from 'types/common/queryBuilder';

import { ICompositeMetricQuery } from '../alerts/compositeQuery';

export interface ViewProps {
	uuid: string;
	name: string;
	category: string;
	createdAt: string;
	createdBy: string;
	updatedAt: string;
	updatedBy: string;
	sourcePage: DataSource;
	tags: string[];
	compositeQuery: ICompositeMetricQuery;
	extraData: string;
}

export interface AllViewsProps {
	status: string;
	data: ViewProps[];
}

export interface SaveViewProps {
	compositeQuery: ICompositeMetricQuery;
	sourcePage: DataSource;
	viewName: string;
	extraData: string;
}

export interface SaveViewPayloadProps {
	status: string;
	data: string;
}

export interface DeleteViewPayloadProps {
	status: string;
}

export interface UpdateViewProps {
	viewKey: string;
	compositeQuery: ICompositeMetricQuery;
	extraData: string;
	sourcePage: string;
	viewName: string;
}

export interface UpdateViewPayloadProps {
	success: string;
	data: ViewProps;
}
