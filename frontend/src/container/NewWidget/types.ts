import { PANEL_TYPES } from 'constants/queryBuilder';
import { Widgets } from 'types/api/dashboard/getAll';

import { timePreferance } from './RightContainer/timeItems';

export interface NewWidgetProps {
	selectedGraph: PANEL_TYPES;
	yAxisUnit: Widgets['yAxisUnit'];
}

export interface WidgetGraphProps extends NewWidgetProps {
	selectedTime: timePreferance;
}
