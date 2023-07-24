import { Widgets } from 'types/api/dashboard/getAll';

export interface GetWidgetQueryBuilderProps {
	query: Widgets['query'];
	title?: string;
	panelTypes: Widgets['panelTypes'];
}
