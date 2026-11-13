import { ReactNode } from 'react';
import { Widgets } from 'types/api/widgets/widget';

export interface GetWidgetQueryBuilderProps {
	query: Widgets['query'];
	title?: ReactNode;
	panelTypes: Widgets['panelTypes'];
	yAxisUnit?: Widgets['yAxisUnit'];
	id?: Widgets['id'];
	fillSpans?: Widgets['fillSpans'];
	columnUnits?: Widgets['columnUnits'];
}
