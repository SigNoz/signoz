import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dispatch, SetStateAction } from 'react';
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
	selectedLogFields: Widgets['selectedLogFields'];
	setSelectedLogFields?: Dispatch<SetStateAction<Widgets['selectedLogFields']>>;
	selectedTracesFields: Widgets['selectedTracesFields'];
	setSelectedTracesFields?: Dispatch<
		SetStateAction<Widgets['selectedTracesFields']>
	>;
}
