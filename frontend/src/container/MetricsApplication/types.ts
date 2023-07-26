import { Widgets } from 'types/api/dashboard/getAll';

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
