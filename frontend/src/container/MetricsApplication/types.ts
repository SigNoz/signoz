import { Widgets } from 'types/api/dashboard/getAll';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { IServiceName } from './Tabs/types';

export interface GetWidgetQueryBuilderProps {
	query: Widgets['query'];
	title?: string;
	panelTypes: Widgets['panelTypes'];
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
