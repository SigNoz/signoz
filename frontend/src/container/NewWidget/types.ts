import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { Widgets } from 'types/api/dashboard/getAll';

import { timePreferance } from './RightContainer/timeItems';

export interface NewWidgetProps {
	selectedGraph: GRAPH_TYPES;
	yAxisUnit: Widgets['yAxisUnit'];
}

export interface WidgetGraphProps extends NewWidgetProps {
	selectedTime: timePreferance;
}
