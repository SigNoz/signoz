import { ReactNode } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { IServiceName } from './Tabs/types';

export interface GetWidgetQueryBuilderProps {
	query: Widgets['query'];
	title?: ReactNode;
	panelTypes: Widgets['panelTypes'];
	yAxisUnit?: Widgets['yAxisUnit'];
	id?: Widgets['id'];
	fillSpans?: Widgets['fillSpans'];
	columnUnits?: Widgets['columnUnits'];
}

export interface NavigateToTraceProps {
	servicename: string;
	operation: string;
	minTime: number;
	maxTime: number;
	selectedTraceTags: string;
	apmToTraceQuery: Query;
	safeNavigate: (path: string) => void;
	openInNewTab: boolean;
}

export interface DatabaseCallsRPSProps extends DatabaseCallProps {
	legend: string;
}

export interface DatabaseCallProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
	dotMetricsEnabled: boolean;
}
