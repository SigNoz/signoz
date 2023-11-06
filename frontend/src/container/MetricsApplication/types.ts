import { ReactNode } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { IServiceName } from './Tabs/types';

export interface GetWidgetQueryBuilderProps {
	query: Widgets['query'];
	title?: ReactNode;
	panelTypes: Widgets['panelTypes'];
	yAxisUnit?: Widgets['yAxisUnit'];
}

export interface NavigateToTraceProps {
	servicename: string;
	operation: string;
	minTime: number;
	maxTime: number;
	selectedTraceTags: string;
}

export interface DatabaseCallsRPSProps extends DatabaseCallProps {
	legend: '{{db_system}}';
}

export interface DatabaseCallProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
}
