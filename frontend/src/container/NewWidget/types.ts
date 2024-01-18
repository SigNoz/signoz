import { PANEL_TYPES } from 'constants/queryBuilder';
import { Widgets } from 'types/api/dashboard/getAll';

import { ThresholdProps } from './RightContainer/Threshold/types';
import { timePreferance } from './RightContainer/timeItems';

export interface NewWidgetProps {
	selectedGraph: PANEL_TYPES;
	yAxisUnit: Widgets['yAxisUnit'];
	fillSpans: Widgets['fillSpans'];
}

export interface WidgetGraphProps extends NewWidgetProps {
	selectedTime: timePreferance;
	thresholds: ThresholdProps[];
	softMin: number | null;
	softMax: number | null;
}
